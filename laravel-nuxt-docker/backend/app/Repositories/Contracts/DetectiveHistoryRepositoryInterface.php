<?php

namespace App\Repositories\Contracts;

use App\Models\DetectiveCompletionHistory;
use App\Models\DetectiveProgress;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface DetectiveHistoryRepositoryInterface
{
    public function record(DetectiveProgress $progress): DetectiveCompletionHistory;

    /** @return Collection<int, DetectiveCompletionHistory> */
    public function getForUser(User $user): Collection;

    public function findForUserOrFail(User $user, int $historyId): DetectiveCompletionHistory;
}
