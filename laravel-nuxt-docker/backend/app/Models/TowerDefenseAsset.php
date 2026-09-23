<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TowerDefenseAsset extends Model
{
    protected $fillable = [
        'key',
        'type',
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
}
