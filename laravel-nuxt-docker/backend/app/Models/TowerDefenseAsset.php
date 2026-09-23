<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TowerDefenseAsset extends Model
{
    public const PURPOSES_BY_TYPE = [
        'model' => ['enemy-model', 'boss-model', 'castle-model', 'map-model', 'tower-model', 'equipment-model', 'animation', 'texture', 'other'],
        'sound' => ['background-music', 'tower-sfx', 'other'],
        'image' => ['enemy-avatar', 'boss-avatar', 'map-image', 'ui-image', 'other'],
    ];

    protected $fillable = [
        'key',
        'type',
        'purpose',
        'path',
        'mime_type',
        'size',
        'metadata',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'metadata' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'key';
    }

    public static function purposes(): array
    {
        return array_values(array_unique(array_merge(...array_values(self::PURPOSES_BY_TYPE))));
    }
}
