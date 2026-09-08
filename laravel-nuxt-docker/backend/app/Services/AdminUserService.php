<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;

class AdminUserService
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function list(?string $search, ?string $role, int $perPage): array
    {
        $users = $this->users->paginateForAdmin($search, $role, $perPage);

        return [
            'users' => $users->getCollection()
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'email_verified_at' => $user->email_verified_at?->toISOString(),
                    'created_at' => $user->created_at?->toISOString(),
                ])
                ->values(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem(),
            ],
        ];
    }
}
