<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetectiveCompletionHistory extends Model
{
    protected $fillable = [
        'run_id', 'user_id', 'case_id', 'elapsed_seconds',
        'evidence_history', 'task_history', 'linked_evidence', 'command_history',
        'statistics', 'started_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'evidence_history' => 'array',
            'task_history' => 'array',
            'linked_evidence' => 'array',
            'command_history' => 'array',
            'statistics' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function detectiveCase(): BelongsTo
    {
        return $this->belongsTo(DetectiveCase::class, 'case_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
