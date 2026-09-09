<?php

namespace App\Repositories\Contracts;

use App\Models\DetectiveCase;
use Illuminate\Database\Eloquent\Collection;

interface DetectiveCaseRepositoryInterface
{
    /** @return Collection<int, DetectiveCase> */
    public function getActive(): Collection;

    public function findActiveOrFail(string $caseId): DetectiveCase;
}
