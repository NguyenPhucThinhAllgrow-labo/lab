<?php

namespace App\Repositories\Contracts;

use App\Models\DetectiveCase;
use App\Models\DetectiveCompletionHistory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface DetectiveLeaderboardRepositoryInterface
{
    /** @return Collection<int, DetectiveCompletionHistory> */
    public function completionHistories(?string $caseId = null): Collection;

    /** @param array<int, int> $historyIds */
    public function paginateBestHistories(
        array $historyIds,
        int $perPage,
        int $page,
    ): LengthAwarePaginator;

    public function paginateCompletionHistories(
        ?string $caseId,
        ?string $search,
        int $perPage,
        int $page,
    ): LengthAwarePaginator;

    /** @return Collection<int, DetectiveCase> */
    public function cases(): Collection;
}
