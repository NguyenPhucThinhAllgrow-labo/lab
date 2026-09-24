<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TowerDefenseProgress extends Model
{
    protected $fillable = [
        'user_id',
        'tower_defense_map_id',
        'max_wave',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'max_wave' => 'integer',
            'completed_at' => 'datetime',
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
