<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetectiveProgress extends Model
{
    protected $table = 'detective_progress';

    protected $attributes = [
        'locale' => 'en',
        'current_directory' => '/',
        'discovered_evidence' => '[]',
        'completed_tasks' => '[]',
        'command_history' => '[]',
        'terminal_lines' => '[]',
        'game_completed' => false,
        'elapsed_seconds' => 0,
        'evidence_history' => '[]',
        'task_history' => '[]',
    ];

    protected $fillable = [
        'user_id',
        'case_id',
        'run_id',
        'locale',
        'current_directory',
        'discovered_evidence',
        'completed_tasks',
        'command_history',
        'terminal_lines',
        'game_completed',
        'elapsed_seconds',
        'evidence_history',
        'task_history',
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
            'elapsed_seconds' => 'integer',
            'evidence_history' => 'array',
            'task_history' => 'array',
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
