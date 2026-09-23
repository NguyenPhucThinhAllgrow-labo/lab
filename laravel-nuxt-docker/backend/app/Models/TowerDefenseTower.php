<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TowerDefenseTower extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'description', 'cost', 'damage', 'range', 'fire_rate',
        'color', 'effects', 'model_asset_keys', 'model_configuration',
        'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'integer',
            'damage' => 'float',
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
