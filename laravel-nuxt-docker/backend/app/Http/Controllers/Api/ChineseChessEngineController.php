<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ChineseChessEngineController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'fen' => ['required', 'string', 'max:160', 'regex:/^[rnbakcpRNBAKCP1-9\/]+ [wb] - - \d+ \d+$/'],
            'candidates' => ['required', 'array', 'min:1', 'max:256'],
            'candidates.*.id' => ['required', 'string', 'max:100', 'distinct'],
            'candidates.*.uci' => ['required', 'string', 'regex:/^[a-i][0-9][a-i][0-9]$/', 'distinct'],
        ]);

        $url = rtrim((string) config('services.chinese_chess_engine.url'), '/');
        $moveTime = max(100, min(5000, (int) config('services.chinese_chess_engine.move_time_ms', 700)));
        $timeout = max(1, (int) config('services.chinese_chess_engine.timeout_seconds', 5));

        try {
            $engineResponse = Http::acceptJson()
                ->timeout($timeout)
                ->post("{$url}/bestmove", [
                    'fen' => $payload['fen'],
                    'search_moves' => array_column($payload['candidates'], 'uci'),
                    'movetime_ms' => $moveTime,
                ]);

            if (! $engineResponse->successful()) {
                throw new ConnectionException("Pikafish returned HTTP {$engineResponse->status()}.");
            }

            $bestMove = strtolower((string) $engineResponse->json('bestmove'));
            $candidate = collect($payload['candidates'])->first(
                fn (array $item): bool => strtolower($item['uci']) === $bestMove,
            );

            if (! is_array($candidate)) {
                throw new ConnectionException('Pikafish returned a move outside the legal candidate set.');
            }

            return response()->json([
                'candidate_id' => $candidate['id'],
                'bestmove' => $bestMove,
                'engine' => [
                    'name' => (string) ($engineResponse->json('engine') ?? 'Pikafish'),
                    'depth' => $engineResponse->json('depth'),
                    'score_cp' => $engineResponse->json('score_cp'),
                    'nodes' => $engineResponse->json('nodes'),
                ],
            ]);
        } catch (Throwable $exception) {
            Log::warning('Pikafish inference unavailable.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Pikafish/NNUE hiện không khả dụng.',
            ], 503);
        }
    }
}
