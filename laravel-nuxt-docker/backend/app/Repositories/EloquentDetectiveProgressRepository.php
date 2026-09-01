<?php

namespace App\Repositories;

use App\Models\DetectiveCase;
use App\Models\DetectiveProgress;
use App\Models\User;
use App\Repositories\Contracts\DetectiveProgressRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class EloquentDetectiveProgressRepository implements DetectiveProgressRepositoryInterface
{
    public function getForUser(User $user): Collection
    {
        return DetectiveProgress::query()
            ->whereBelongsTo($user)
            ->with('detectiveCase:id,title')
            ->latest('last_played_at')
            ->get();
    }

    public function findForUserAndCase(User $user, DetectiveCase $case): ?DetectiveProgress
    {
        return DetectiveProgress::query()
            ->where('user_id', $user->getKey())
            ->where('case_id', $case->getKey())
            ->first();
    }

    public function saveForUserAndCase(User $user, DetectiveCase $case, array $data): DetectiveProgress
    {
        $progress = DetectiveProgress::query()->updateOrCreate(
            [
                'user_id' => $user->getKey(),
                'case_id' => $case->getKey(),
            ],
            $data,
        );

        return $progress->fresh();
    }

    public function deleteForUserAndCase(User $user, DetectiveCase $case): void
    {
        DetectiveProgress::query()
            ->where('user_id', $user->getKey())
            ->where('case_id', $case->getKey())
            ->delete();
    }
}
