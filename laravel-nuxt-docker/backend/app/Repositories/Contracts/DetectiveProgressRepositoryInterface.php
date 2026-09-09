<?php

namespace App\Repositories\Contracts;

use App\Models\DetectiveCase;
use App\Models\DetectiveProgress;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface DetectiveProgressRepositoryInterface
{
    /** @return Collection<int, DetectiveProgress> */
    public function getForUser(User $user): Collection;

    public function findForUserAndCase(User $user, DetectiveCase $case): ?DetectiveProgress;

    public function saveForUserAndCase(User $user, DetectiveCase $case, array $data): DetectiveProgress;

    public function deleteForUserAndCase(User $user, DetectiveCase $case): void;
}
