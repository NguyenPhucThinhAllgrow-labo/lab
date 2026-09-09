<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'code', 'host_id', 'red_player_id', 'black_player_id', 'status',
    'current_turn', 'board', 'move_history', 'red_time_seconds',
    'black_time_seconds', 'started_at', 'last_move_at', 'paused_by_id',
    'paused_at', 'winner_id',
    'finish_reason', 'version', 'red_ready', 'black_ready',
    'red_rematch', 'black_rematch',
])]
class ChineseChessRoom extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'board' => 'array',
            'move_history' => 'array',
            'started_at' => 'datetime',
            'last_move_at' => 'datetime',
            'paused_at' => 'datetime',
            'red_time_seconds' => 'integer',
            'black_time_seconds' => 'integer',
            'version' => 'integer',
            'red_ready' => 'boolean',
            'black_ready' => 'boolean',
            'red_rematch' => 'boolean',
            'black_rematch' => 'boolean',
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

    public function colorFor(int $userId): ?string
    {
        return match ($userId) {
            $this->red_player_id => 'red',
            $this->black_player_id => 'black',
            default => null,
        };
    }
}
