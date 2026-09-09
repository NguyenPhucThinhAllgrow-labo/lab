<?php

namespace App\Repositories;

use App\Models\DetectiveCase;
use App\Models\DetectiveCompletionHistory;
use App\Repositories\Contracts\DetectiveLeaderboardRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

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

    public function paginateBestHistories(array $historyIds, int $perPage, int $page): LengthAwarePaginator
    {
        $query = $this->historyQuery()->whereIn('id', $historyIds);

        if ($historyIds !== []) {
            $order = collect($historyIds)
                ->values()
                ->map(fn (int $id, int $index): string => "WHEN {$id} THEN {$index}")
                ->implode(' ');
            $query->orderByRaw("CASE id {$order} ELSE ".count($historyIds).' END');
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    public function paginateCompletionHistories(
        ?string $caseId,
        ?string $search,
        int $perPage,
        int $page,
    ): LengthAwarePaginator {
        return $this->historyQuery()
            ->when($caseId, fn ($query, string $value) => $query->where('case_id', $value))
            ->when($search, function ($query, string $value): void {
                $query->whereHas('user', function ($userQuery) use ($value): void {
                    $userQuery->where(function ($identityQuery) use ($value): void {
                        $identityQuery
                            ->where('name', 'like', "%{$value}%")
                            ->orWhere('email', 'like', "%{$value}%");
                    });
                });
            })
            ->orderByDesc('completed_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    public function cases(): Collection
    {
        return DetectiveCase::query()
            ->whereHas('completionHistories')
            ->orderBy('sort_order')
            ->get(['id', 'title', 'sort_order']);
    }

    private function historyQuery()
    {
        return DetectiveCompletionHistory::query()->with([
            'user:id,name,email',
            'detectiveCase:id,title,sort_order',
        ]);
    }
}
