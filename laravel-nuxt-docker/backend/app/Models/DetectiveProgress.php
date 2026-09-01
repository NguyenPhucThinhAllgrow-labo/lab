<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetectiveProgress extends Model
{
    protected $table = 'detective_progress';

    protected $fillable = [
        'user_id',
        'case_id',
        'locale',
        'current_directory',
        'discovered_evidence',
        'completed_tasks',
        'command_history',
        'terminal_lines',
        'game_completed',
        'last_played_at',
    ];

    protected function casts(): array
    {
        return [
            'discovered_evidence' => 'array',
            'completed_tasks' => 'array',
            'command_history' => 'array',
            'terminal_lines' => 'array',
            'game_completed' => 'boolean',
            'last_played_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function detectiveCase(): BelongsTo
    {
        return $this->belongsTo(DetectiveCase::class, 'case_id');
    }
}
