<?php

namespace App\Services;

use App\Models\ChineseChessRoom;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ChineseChessRoomService
{
    public function __construct(private readonly ChineseChessEngine $engine) {}

    public function create(User $user): ChineseChessRoom
    {
        $active = ChineseChessRoom::query()
            ->where(fn ($query) => $query->where('red_player_id', $user->id)->orWhere('black_player_id', $user->id))
            ->whereIn('status', ['waiting', 'playing', 'paused'])
            ->latest()
            ->first();

        if ($active) {
            return $this->load($active);
        }

        do {
            $code = Str::upper(Str::random(6));
        } while (ChineseChessRoom::where('code', $code)->exists());

        return $this->load(ChineseChessRoom::create([
            'code' => $code,
            'host_id' => $user->id,
            'red_player_id' => $user->id,
            'board' => $this->engine->initialBoard(),
            'move_history' => [],
        ]));
    }

    public function join(string $code, User $user): ChineseChessRoom
    {
        $room = DB::transaction(function () use ($code, $user): ChineseChessRoom {
            $room = $this->findLocked($code);
            if ($room->colorFor($user->id)) {
                return $room;
            }
            if ($room->status !== 'waiting' || $room->black_player_id) {
                throw ValidationException::withMessages(['room' => 'Phòng đã đủ người hoặc ván đấu đã bắt đầu.']);
            }

            $room->fill([
                'black_player_id' => $user->id,
                'black_ready' => false,
                'version' => $room->version + 1,
            ])->save();

            return $room;
        });

        return $this->load($room);
    }

    public function ready(string $code, User $user): ChineseChessRoom
    {
        $room = DB::transaction(function () use ($code, $user): ChineseChessRoom {
            $room = $this->findLocked($code);
            $color = $this->assertPlayer($room, $user);

            if ($room->status !== 'waiting') {
                return $room;
            }
            if (! $room->black_player_id) {
                throw ValidationException::withMessages(['room' => 'Hãy chờ đối thủ vào phòng trước khi sẵn sàng.']);
            }

            $readyField = $color.'_ready';
            if (! $room->{$readyField}) {
                $room->{$readyField} = true;
                $room->version++;
            }

            if ($room->red_ready && $room->black_ready) {
                $room->fill([
                    'status' => 'playing',
                    'current_turn' => 'red',
                    'starting_color' => 'red',
                    'started_at' => now(),
                    'last_move_at' => now(),
                ]);
            }

            if ($room->isDirty()) {
                $room->save();
            }

            return $room;
        });

        return $this->load($room);
    }

    public function show(string $code, User $user): ChineseChessRoom
    {
        $room = DB::transaction(function () use ($code, $user): ChineseChessRoom {
            $room = $this->findLocked($code);
            $this->assertPlayer($room, $user);
            $this->syncClock($room);
            if ($room->isDirty()) {
                $room->save();
            }

            return $room;
        });

        return $this->load($room);
    }

    public function move(string $code, User $user, array $payload): ChineseChessRoom
    {
        $room = DB::transaction(function () use ($code, $user, $payload): ChineseChessRoom {
            $room = $this->findLocked($code);
            $color = $this->assertPlayer($room, $user);
            $this->syncClock($room);

            if ($room->status !== 'playing') {
                $room->save();

                return $room;
            }
            if ((int) $payload['version'] !== $room->version) {
                throw ValidationException::withMessages(['version' => 'Bàn cờ đã thay đổi. Đang đồng bộ lại dữ liệu mới nhất.']);
            }
            if ($room->current_turn !== $color) {
                throw ValidationException::withMessages(['turn' => 'Chưa đến lượt của bạn.']);
            }

            $piece = $this->engine->piece($room->board, $payload['piece_id']);
            if (! $piece || $piece['color'] !== $color) {
                throw ValidationException::withMessages(['piece_id' => 'Bạn không thể di chuyển quân cờ này.']);
            }
            if (! $this->engine->isLegalMove($room->board, $piece, (int) $payload['to']['row'], (int) $payload['to']['col'])) {
                throw ValidationException::withMessages(['move' => 'Nước đi không hợp lệ.']);
            }

            [$board, $captured] = $this->engine->move($room->board, $piece['id'], (int) $payload['to']['row'], (int) $payload['to']['col']);
            $opponent = $color === 'red' ? 'black' : 'red';
            $isCheck = $this->engine->isInCheck($board, $opponent);
            $history = $room->move_history ?? [];
            $history[] = [
                'number' => count($history) + 1,
                'color' => $color,
                'piece' => $piece,
                'from' => ['row' => $piece['row'], 'col' => $piece['col']],
                'to' => ['row' => (int) $payload['to']['row'], 'col' => (int) $payload['to']['col']],
                'captured' => $captured,
                'is_check' => $isCheck,
                'played_at' => now()->toISOString(),
            ];

            $room->fill([
                'board' => $board,
                'move_history' => $history,
                'current_turn' => $opponent,
                'last_move_at' => now(),
                'version' => $room->version + 1,
            ]);

            if (! $this->engine->hasLegalMove($board, $opponent)) {
                $this->finish($room, $user->id, $isCheck ? 'checkmate' : 'stalemate');
            }

            $room->save();

            return $room;
        });

        return $this->load($room);
    }

    public function surrender(string $code, User $user): ChineseChessRoom
    {
        return $this->finishByPlayerAction($code, $user, 'surrender');
    }

    public function pause(string $code, User $user): ChineseChessRoom
    {
        $room = DB::transaction(function () use ($code, $user): ChineseChessRoom {
            $room = $this->findLocked($code);
            $this->assertPlayer($room, $user);
            $this->syncClock($room);

            if ($room->status === 'playing') {
                $room->fill([
                    'status' => 'paused',
                    'paused_by_id' => $user->id,
                    'paused_at' => now(),
                    'last_move_at' => null,
                    'version' => $room->version + 1,
                ]);
            }

            if ($room->isDirty()) {
                $room->save();
            }

            return $room;
        });

        return $this->load($room);
    }

    public function resume(string $code, User $user): ChineseChessRoom
    {
        $room = DB::transaction(function () use ($code, $user): ChineseChessRoom {
            $room = $this->findLocked($code);
            $this->assertPlayer($room, $user);

            if ($room->status === 'paused') {
                $room->fill([
                    'status' => 'playing',
                    'paused_by_id' => null,
                    'paused_at' => null,
                    'last_move_at' => now(),
                    'version' => $room->version + 1,
                ])->save();
            }

            return $room;
        });

        return $this->load($room);
    }

    public function leave(string $code, User $user): ChineseChessRoom
    {
        $room = DB::transaction(function () use ($code, $user): ChineseChessRoom {
            $room = $this->findLocked($code);
            $color = $this->assertPlayer($room, $user);

            if ($room->status === 'waiting') {
                if ($color === 'red') {
                    $room->fill(['status' => 'cancelled', 'finish_reason' => 'host_left']);
                } else {
                    $room->black_player_id = null;
                    $room->black_ready = false;
                }
            } elseif (in_array($room->status, ['playing', 'paused'], true)) {
                $winnerId = $color === 'red' ? $room->black_player_id : $room->red_player_id;
                $this->finish($room, $winnerId, 'player_left');
            }

            $room->version++;
            $room->save();

            return $room;
        });

        return $this->load($room);
    }

    public function rematch(string $code, User $user): ChineseChessRoom
    {
        $room = DB::transaction(function () use ($code, $user): ChineseChessRoom {
            $room = $this->findLocked($code);
            $color = $this->assertPlayer($room, $user);
            if ($room->status !== 'finished' || ! $room->black_player_id) {
                throw ValidationException::withMessages(['game' => 'Chỉ có thể tái đấu sau khi ván chơi kết thúc.']);
            }

            $room->{$color.'_rematch'} = true;
            $room->version++;
            if ($room->red_rematch && $room->black_rematch) {
                $nextStartingColor = match ((int) $room->winner_id) {
                    (int) $room->red_player_id => 'black',
                    (int) $room->black_player_id => 'red',
                    default => 'red',
                };

                $room->fill([
                    'status' => 'playing',
                    'current_turn' => $nextStartingColor,
                    'starting_color' => $nextStartingColor,
                    'round_number' => $room->round_number + 1,
                    'board' => $this->engine->initialBoard(),
                    'move_history' => [],
                    'red_time_seconds' => 600,
                    'black_time_seconds' => 600,
                    'started_at' => now(),
                    'last_move_at' => now(),
                    'winner_id' => null,
                    'finish_reason' => null,
                    'red_rematch' => false,
                    'black_rematch' => false,
                ]);
            }
            $room->save();

            return $room;
        });

        return $this->load($room);
    }

    public function state(ChineseChessRoom $room, User $viewer): array
    {
        $room->loadMissing(['redPlayer:id,name', 'blackPlayer:id,name', 'winner:id,name', 'pausedBy:id,name']);

        return [
            'id' => $room->id,
            'code' => $room->code,
            'status' => $room->status,
            'round_number' => $room->round_number,
            'current_turn' => $room->current_turn,
            'starting_color' => $room->starting_color,
            'board' => $room->board,
            'move_history' => $room->move_history ?? [],
            'red_time_seconds' => $this->displayTime($room, 'red'),
            'black_time_seconds' => $this->displayTime($room, 'black'),
            'red_player' => $room->redPlayer,
            'black_player' => $room->blackPlayer,
            'winner' => $room->winner,
            'finish_reason' => $room->finish_reason,
            'version' => $room->version,
            'your_color' => $room->colorFor($viewer->id),
            'red_ready' => $room->red_ready,
            'black_ready' => $room->black_ready,
            'red_rematch' => $room->red_rematch,
            'black_rematch' => $room->black_rematch,
            'server_time' => now()->toISOString(),
            'last_move_at' => $room->last_move_at?->toISOString(),
            'paused_by' => $room->pausedBy,
            'paused_at' => $room->paused_at?->toISOString(),
        ];
    }

    private function finishByPlayerAction(string $code, User $user, string $reason): ChineseChessRoom
    {
        $room = DB::transaction(function () use ($code, $user, $reason): ChineseChessRoom {
            $room = $this->findLocked($code);
            $color = $this->assertPlayer($room, $user);
            $this->syncClock($room);
            if (! in_array($room->status, ['playing', 'paused'], true)) {
                $room->save();

                return $room;
            }
            $winnerId = $color === 'red' ? $room->black_player_id : $room->red_player_id;
            $this->finish($room, $winnerId, $reason);
            $room->version++;
            $room->save();

            return $room;
        });

        return $this->load($room);
    }

    private function syncClock(ChineseChessRoom $room): void
    {
        if ($room->status !== 'playing' || ! $room->last_move_at) {
            return;
        }
        $elapsed = (int) max(0, floor($room->last_move_at->diffInSeconds(now())));
        if ($elapsed === 0) {
            return;
        }

        $field = $room->current_turn.'_time_seconds';
        $room->{$field} = max(0, $room->{$field} - $elapsed);
        // Preserve the sub-second remainder. Resetting to now on every fast poll
        // would gradually make the chess clock run slower than real time.
        $room->last_move_at = $room->last_move_at->addSeconds($elapsed);
        if ($room->{$field} === 0) {
            $winnerId = $room->current_turn === 'red' ? $room->black_player_id : $room->red_player_id;
            $this->finish($room, $winnerId, 'timeout');
            $room->version++;
        }
    }

    private function displayTime(ChineseChessRoom $room, string $color): int
    {
        $seconds = $room->{$color.'_time_seconds'};
        if ($room->status === 'playing' && $room->current_turn === $color && $room->last_move_at) {
            return (int) max(0, $seconds - floor(max(0, $room->last_move_at->diffInSeconds(now()))));
        }

        return $seconds;
    }

    private function finish(ChineseChessRoom $room, ?int $winnerId, string $reason): void
    {
        $room->fill([
            'status' => 'finished',
            'winner_id' => $winnerId,
            'finish_reason' => $reason,
            'last_move_at' => null,
            'paused_by_id' => null,
            'paused_at' => null,
        ]);
    }

    private function assertPlayer(ChineseChessRoom $room, User $user): string
    {
        $color = $room->colorFor($user->id);
        if (! $color) {
            abort(403, 'Bạn không thuộc phòng chơi này.');
        }

        return $color;
    }

    private function findLocked(string $code): ChineseChessRoom
    {
        return ChineseChessRoom::where('code', Str::upper($code))->lockForUpdate()->firstOrFail();
    }

    private function load(ChineseChessRoom $room): ChineseChessRoom
    {
        return $room->fresh(['redPlayer:id,name', 'blackPlayer:id,name', 'winner:id,name', 'pausedBy:id,name']);
    }
}
