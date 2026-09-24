<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TowerDefenseEffectType extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id', 'name', 'role', 'behavior', 'description', 'color', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'is_active' => 'boolean'];
    }
}
