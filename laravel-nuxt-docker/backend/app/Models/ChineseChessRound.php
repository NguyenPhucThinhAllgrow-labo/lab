<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChineseChessRound extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['board' => 'array', 'move_history' => 'array', 'state' => 'array',
            'round_number' => 'integer', 'started_at' => 'datetime', 'finished_at' => 'datetime'];
    }

    public function room(): BelongsTo { return $this->belongsTo(ChineseChessRoom::class, 'room_id'); }
    public function redPlayer(): BelongsTo { return $this->belongsTo(User::class, 'red_player_id'); }
    public function blackPlayer(): BelongsTo { return $this->belongsTo(User::class, 'black_player_id'); }
    public function winner(): BelongsTo { return $this->belongsTo(User::class, 'winner_id'); }

    public static function record(ChineseChessRoom $room): void
    {
        $round = static::firstOrNew(['room_id' => $room->id, 'round_number' => $room->round_number]);
        // Rematch requests and leaving a finished room must not rewrite its result.
        if ($round->exists && in_array($round->status, ['finished', 'cancelled'], true)) {
            return;
        }
        $round->fill([
            'red_player_id' => $room->red_player_id, 'black_player_id' => $room->black_player_id,
            'winner_id' => $room->winner_id, 'status' => $room->status, 'finish_reason' => $room->finish_reason,
            'board' => $room->board, 'move_history' => $room->move_history ?? [],
            'state' => $room->attributesToArray(), 'started_at' => $room->started_at,
            'finished_at' => in_array($room->status, ['finished', 'cancelled'], true) ? now() : null,
        ])->save();
    }
}
