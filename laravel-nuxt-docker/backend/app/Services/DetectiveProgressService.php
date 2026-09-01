<?php

namespace App\Services;

use App\Models\DetectiveProgress;
use App\Models\User;
use App\Repositories\Contracts\DetectiveCaseRepositoryInterface;
use App\Repositories\Contracts\DetectiveProgressRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Arr;

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
    ];

    public function __construct(
        private readonly DetectiveCaseRepositoryInterface $cases,
        private readonly DetectiveProgressRepositoryInterface $progress,
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

        return $this->progress->saveForUserAndCase(
            $user,
            $case,
            [
                ...Arr::only($data, self::SAVABLE_FIELDS),
                'last_played_at' => now(),
            ],
        );
    }

    public function resetForUser(User $user, string $caseId): void
    {
        $case = $this->cases->findActiveOrFail($caseId);

        $this->progress->deleteForUserAndCase($user, $case);
    }
}
