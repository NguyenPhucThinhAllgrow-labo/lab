#!/usr/bin/env python3
import json
import os
import re
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

FEN_RE = re.compile(r"^[rnbakcpRNBAKCP1-9/]+ [wb] - - \d+ \d+$")
MOVE_RE = re.compile(r"^[a-i][0-9][a-i][0-9]$")


class Pikafish:
    def __init__(self):
        self.binary = os.getenv("PIKAFISH_BINARY", "/opt/pikafish/pikafish")
        self.network = os.getenv("PIKAFISH_NETWORK", "/opt/pikafish/pikafish.nnue")
        self.threads = max(1, min(16, int(os.getenv("PIKAFISH_THREADS", "1"))))
        self.hash_mb = max(16, min(2048, int(os.getenv("PIKAFISH_HASH_MB", "128"))))
        self.lock = threading.Lock()
        self.process = None
        self.name = "Pikafish"
        self._start()

    def _start(self):
        if self.process and self.process.poll() is None:
            return
        self.process = subprocess.Popen(
            [self.binary],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        self._send("uci")
        for line in self._read_until("uciok"):
            if line.startswith("id name "):
                self.name = line.removeprefix("id name ").strip()
        self._send(f"setoption name EvalFile value {self.network}")
        self._send(f"setoption name Threads value {self.threads}")
        self._send(f"setoption name Hash value {self.hash_mb}")
        self.ready()
        # isready does not load/verify NNUE. A one-node search makes startup and
        # Docker health fail immediately when engine and network are mismatched.
        self._send("position startpos")
        self._send("go nodes 1")
        self._read_until("bestmove ")

    def _send(self, command):
        if not self.process or not self.process.stdin or self.process.poll() is not None:
            raise RuntimeError("Pikafish process is not running")
        self.process.stdin.write(command + "\n")
        self.process.stdin.flush()

    def _read_until(self, marker):
        lines = []
        if not self.process or not self.process.stdout:
            raise RuntimeError("Pikafish stdout is unavailable")
        while True:
            line = self.process.stdout.readline()
            if line == "":
                raise RuntimeError("Pikafish stopped unexpectedly")
            line = line.strip()
            lines.append(line)
            if line.startswith(marker):
                return lines

    def ready(self):
        self._send("isready")
        self._read_until("readyok")

    def bestmove(self, fen, search_moves, movetime_ms):
        with self.lock:
            try:
                self._start()
                self._send(f"position fen {fen}")
                # Pikafish requires searchmoves to be the final token group.
                self._send(f"go movetime {movetime_ms} searchmoves {' '.join(search_moves)}")
                lines = self._read_until("bestmove ")
            except Exception:
                if self.process and self.process.poll() is None:
                    self.process.kill()
                self.process = None
                raise

        best_line = lines[-1].split()
        result = {"bestmove": best_line[1], "engine": self.name}
        info = next((line for line in reversed(lines) if line.startswith("info depth ") and " pv " in line), "")
        for key in ("depth", "nodes"):
            match = re.search(rf"\b{key} (\d+)", info)
            result[key] = int(match.group(1)) if match else None
        score = re.search(r"\bscore cp (-?\d+)", info)
        result["score_cp"] = int(score.group(1)) if score else None
        return result


ENGINE = Pikafish()


class Handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/health":
            return self._json(404, {"message": "Not found"})
        try:
            with ENGINE.lock:
                ENGINE._start()
                ENGINE.ready()
            return self._json(200, {"status": "ok", "engine": ENGINE.name})
        except Exception as error:
            return self._json(503, {"status": "error", "message": str(error)})

    def do_POST(self):
        if self.path != "/bestmove":
            return self._json(404, {"message": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 65536:
                raise ValueError("Invalid request size")
            payload = json.loads(self.rfile.read(length))
            fen = payload.get("fen", "")
            moves = payload.get("search_moves", [])
            movetime = max(100, min(5000, int(payload.get("movetime_ms", 700))))
            if not isinstance(fen, str) or not FEN_RE.fullmatch(fen):
                raise ValueError("Invalid FEN")
            if not isinstance(moves, list) or not moves or len(moves) > 256:
                raise ValueError("Invalid search_moves")
            if any(not isinstance(move, str) or not MOVE_RE.fullmatch(move) for move in moves):
                raise ValueError("Invalid UCI move")
            return self._json(200, ENGINE.bestmove(fen, moves, movetime))
        except (ValueError, json.JSONDecodeError) as error:
            return self._json(422, {"message": str(error)})
        except Exception as error:
            return self._json(503, {"message": str(error)})

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}", flush=True)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
