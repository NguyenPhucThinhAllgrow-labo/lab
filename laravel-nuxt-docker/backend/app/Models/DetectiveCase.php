<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DetectiveCase extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'title',
        'description',
        'scenario',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'title' => 'array',
            'description' => 'array',
            'scenario' => 'array',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function progresses(): HasMany
    {
        return $this->hasMany(DetectiveProgress::class, 'case_id');
    }

    public function completionHistories(): HasMany
    {
        return $this->hasMany(DetectiveCompletionHistory::class, 'case_id');
    }
}
