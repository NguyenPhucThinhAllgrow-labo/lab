<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TowerDefenseGameSession extends Model
{
    protected $fillable = [
        'user_id',
        'tower_defense_map_id',
        'faction',
        'status',
        'current_wave',
        'score',
        'castle_health',
        'snapshot',
        'started_at',
        'last_played_at',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'current_wave' => 'integer',
            'score' => 'integer',
            'castle_health' => 'integer',
            'snapshot' => 'array',
            'started_at' => 'datetime',
            'last_played_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function map(): BelongsTo
    {
        return $this->belongsTo(TowerDefenseMap::class, 'tower_defense_map_id');
    }
}
