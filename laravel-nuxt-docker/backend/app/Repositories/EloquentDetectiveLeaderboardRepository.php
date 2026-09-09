<?php

namespace App\Repositories;

use App\Models\DetectiveCase;
use App\Models\DetectiveCompletionHistory;
use App\Repositories\Contracts\DetectiveLeaderboardRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class EloquentDetectiveLeaderboardRepository implements DetectiveLeaderboardRepositoryInterface
{
    public function completionHistories(?string $caseId = null): Collection
    {
        return DetectiveCompletionHistory::query()
            ->with([
                'user:id,name,email',
                'detectiveCase:id,title,sort_order',
            ])
            ->when($caseId, fn ($query, string $value) => $query->where('case_id', $value))
            ->get();
    }

    public function cases(): Collection
    {
        return DetectiveCase::query()
            ->whereHas('completionHistories')
            ->orderBy('sort_order')
            ->get(['id', 'title', 'sort_order']);
    }
}
