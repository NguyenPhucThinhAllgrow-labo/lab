<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TowerDefenseTower extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'description', 'role', 'cost', 'damage', 'damage_by_level', 'max_level', 'level_stats', 'range', 'fire_rate',
        'color', 'image_asset_key', 'effects', 'model_asset_keys', 'model_configuration',
        'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'integer',
            'damage' => 'float',
            'damage_by_level' => 'array',
            'max_level' => 'integer',
            'level_stats' => 'array',
            'range' => 'float',
            'fire_rate' => 'float',
            'effects' => 'array',
            'model_asset_keys' => 'array',
            'model_configuration' => 'array',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
