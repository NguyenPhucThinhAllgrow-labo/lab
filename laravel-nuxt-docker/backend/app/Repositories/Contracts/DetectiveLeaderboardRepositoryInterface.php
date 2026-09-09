<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;

interface DetectiveLeaderboardRepositoryInterface
{
    /** @return Collection<int, \App\Models\DetectiveCompletionHistory> */
    public function completionHistories(?string $caseId = null): Collection;

    /** @return Collection<int, \App\Models\DetectiveCase> */
    public function cases(): Collection;
}
