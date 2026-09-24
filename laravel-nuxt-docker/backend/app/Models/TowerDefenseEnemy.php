<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TowerDefenseEnemy extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'kind',
        'model_asset_key',
        'avatar_asset_key',
        'left_weapon_asset_key',
        'right_weapon_asset_key',
        'base_health',
        'base_speed',
        'reward',
        'castle_damage',
        'summary',
        'resistance',
        'weakness',
        'display_configuration',
        'model_configuration',
        'combat_profile',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'base_health' => 'integer',
            'base_speed' => 'float',
            'reward' => 'integer',
            'castle_damage' => 'integer',
            'display_configuration' => 'array',
            'model_configuration' => 'array',
            'combat_profile' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
