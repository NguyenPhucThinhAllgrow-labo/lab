<?php

namespace App\Repositories;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class EloquentUserRepository implements UserRepositoryInterface
{
    public function paginateForAdmin(
        ?string $search = null,
        ?string $role = null,
        int $perPage = 15,
    ): LengthAwarePaginator {
        return User::query()
            ->select([
                'id',
                'name',
                'email',
                'role',
                'email_verified_at',
                'created_at',
            ])
            ->when($search, function (Builder $query, string $value): void {
                $query->where(function (Builder $searchQuery) use ($value): void {
                    $searchQuery
                        ->where('name', 'like', "%{$value}%")
                        ->orWhere('email', 'like', "%{$value}%");
                });
            })
            ->when($role, fn (Builder $query, string $value): Builder => $query->where('role', $value))
            ->latest('id')
            ->paginate($perPage);
    }
}
