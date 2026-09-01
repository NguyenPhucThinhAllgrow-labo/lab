<?php

namespace App\Services;

use App\Models\DetectiveProgress;
use App\Models\User;
use App\Repositories\Contracts\DetectiveCaseRepositoryInterface;
use App\Repositories\Contracts\DetectiveHistoryRepositoryInterface;
use App\Repositories\Contracts\DetectiveProgressRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class DetectiveProgressService
{
    private const SAVABLE_FIELDS = [
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
    ];

    public function __construct(
        private readonly DetectiveCaseRepositoryInterface $cases,
        private readonly DetectiveProgressRepositoryInterface $progress,
        private readonly DetectiveHistoryRepositoryInterface $history,
    ) {}

    public function listForUser(User $user): Collection
    {
        return $this->progress->getForUser($user);
    }

    public function getForUser(User $user, string $caseId): ?DetectiveProgress
    {
        $case = $this->cases->findActiveOrFail($caseId);

        return $this->progress->findForUserAndCase($user, $case);
    }

    public function saveForUser(User $user, string $caseId, array $data): DetectiveProgress
    {
        $case = $this->cases->findActiveOrFail($caseId);

        $existing = $this->progress->findForUserAndCase($user, $case);

        $progress = $this->progress->saveForUserAndCase(
            $user,
            $case,
            [
                ...Arr::only($data, self::SAVABLE_FIELDS),
                'run_id' => $existing?->run_id ?? (string) Str::uuid(),
                'last_played_at' => now(),
            ],
        );

        if ($progress->game_completed) {
            $this->history->record($progress);
        }

        return $progress;
    }

    public function resetForUser(User $user, string $caseId): void
    {
        $case = $this->cases->findActiveOrFail($caseId);

        $this->progress->deleteForUserAndCase($user, $case);
    }

    public function completionHistory(User $user): Collection
    {
        return $this->history->getForUser($user);
    }

    public function completionHistoryDetail(User $user, int $historyId)
    {
        return $this->history->findForUserOrFail($user, $historyId);
    }
}
