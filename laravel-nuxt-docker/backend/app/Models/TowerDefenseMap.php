<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TowerDefenseMap extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'configuration',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'configuration' => 'array',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function definition(): array
    {
        return array_replace($this->configuration, [
            'id' => $this->id,
            'name' => $this->name,
        ]);
    }
}
