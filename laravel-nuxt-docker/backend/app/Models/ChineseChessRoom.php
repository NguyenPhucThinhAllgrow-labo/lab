<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'code', 'host_id', 'red_player_id', 'black_player_id', 'status',
    'current_turn', 'starting_color', 'round_number', 'board', 'move_history', 'position_history',
    'repetition_state', 'red_time_seconds',
    'black_time_seconds', 'started_at', 'last_move_at', 'paused_by_id',
    'paused_at', 'winner_id',
    'finish_reason', 'version', 'red_ready', 'black_ready',
    'red_rematch', 'black_rematch', 'red_undos_remaining', 'black_undos_remaining',
    'undo_requested_by_id', 'undo_requested_at',
])]
class ChineseChessRoom extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::saved(function (self $room): void {
            // Reload database defaults on creation before recording the first round.
            ChineseChessRound::record($room->fresh());
        });
    }

    public function rounds(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ChineseChessRound::class, 'room_id')->orderBy('round_number');
    }

    protected function casts(): array
    {
        return [
            'board' => 'array',
            'move_history' => 'array',
            'position_history' => 'array',
            'repetition_state' => 'array',
            'started_at' => 'datetime',
            'last_move_at' => 'datetime',
            'paused_at' => 'datetime',
            'red_time_seconds' => 'integer',
            'black_time_seconds' => 'integer',
            'version' => 'integer',
            'round_number' => 'integer',
            'red_ready' => 'boolean',
            'black_ready' => 'boolean',
            'red_rematch' => 'boolean',
            'black_rematch' => 'boolean',
            'red_undos_remaining' => 'integer',
            'black_undos_remaining' => 'integer',
            'undo_requested_at' => 'datetime',
        ];
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function redPlayer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'red_player_id');
    }

    public function blackPlayer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'black_player_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_id');
    }

    public function pausedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paused_by_id');
    }

    public function undoRequestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'undo_requested_by_id');
    }

    public function colorFor(int $userId): ?string
    {
        return match ($userId) {
            $this->red_player_id => 'red',
            $this->black_player_id => 'black',
            default => null,
        };
    }
}
