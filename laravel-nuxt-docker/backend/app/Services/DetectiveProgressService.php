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
        'linked_evidence',
        'unlocked_paths',
        'command_history',
        'hint_count',
        'hint_penalty',
        'hint_history',
        'incorrect_link_attempts',
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

        $savable = Arr::only($data, self::SAVABLE_FIELDS);

        if (array_key_exists('hint_history', $savable)) {
            $hintHistory = collect($savable['hint_history'] ?? [])
                ->unique(fn (array $hint): string => implode(':', [
                    $hint['task_id'] ?? 'general',
                    $hint['evidence_id'],
                    $hint['level'],
                ]))
                ->values()
                ->all();

            $savable['hint_history'] = $hintHistory;
            $savable['hint_count'] = count($hintHistory);
            $savable['hint_penalty'] = (int) collect($hintHistory)->sum('penalty');
        }

        $progress = $this->progress->saveForUserAndCase(
            $user,
            $case,
            [
                ...$savable,
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
