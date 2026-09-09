<?php

namespace App\Repositories;

use App\Models\DetectiveCase;
use App\Repositories\Contracts\DetectiveCaseRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class EloquentDetectiveCaseRepository implements DetectiveCaseRepositoryInterface
{
    public function getActive(): Collection
    {
        return DetectiveCase::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();
    }

    public function findActiveOrFail(string $caseId): DetectiveCase
    {
        return DetectiveCase::query()
            ->whereKey($caseId)
            ->where('is_active', true)
            ->firstOrFail();
    }
}
