<?php

namespace App\Repositories;

use App\Models\DetectiveCompletionHistory;
use App\Models\DetectiveProgress;
use App\Models\User;
use App\Repositories\Contracts\DetectiveHistoryRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class EloquentDetectiveHistoryRepository implements DetectiveHistoryRepositoryInterface
{
    public function record(DetectiveProgress $progress): DetectiveCompletionHistory
    {
        return DetectiveCompletionHistory::query()->firstOrCreate(
            ['run_id' => $progress->run_id],
            [
                'user_id' => $progress->user_id,
                'case_id' => $progress->case_id,
                'elapsed_seconds' => $progress->elapsed_seconds,
                'evidence_history' => $progress->evidence_history ?? [],
                'task_history' => $progress->task_history ?? [],
                'linked_evidence' => $progress->linked_evidence ?? [],
                'command_history' => $progress->command_history ?? [],
                'statistics' => [
                    'evidence_count' => count($progress->evidence_history ?? []),
                    'task_count' => count($progress->task_history ?? []),
                    'command_count' => count($progress->command_history ?? []),
                    'hint_count' => $progress->hint_count,
                    'hint_penalty' => $progress->hint_penalty,
                    'score' => max(0, 100 - $progress->hint_penalty),
                    'average_seconds_per_evidence' => count($progress->evidence_history ?? [])
                        ? round($progress->elapsed_seconds / count($progress->evidence_history), 2)
                        : null,
                ],
                'started_at' => $progress->created_at,
                'completed_at' => now(),
            ],
        );
    }

    public function getForUser(User $user): Collection
    {
        return DetectiveCompletionHistory::query()
            ->where('user_id', $user->getKey())
            ->with('detectiveCase:id,title')
            ->latest('completed_at')
            ->get();
    }

    public function findForUserOrFail(User $user, int $historyId): DetectiveCompletionHistory
    {
        return DetectiveCompletionHistory::query()
            ->where('user_id', $user->getKey())
            ->with('detectiveCase:id,title')
            ->findOrFail($historyId);
    }
}
