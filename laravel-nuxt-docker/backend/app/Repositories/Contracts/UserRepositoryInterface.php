<?php

namespace App\Repositories\Contracts;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface UserRepositoryInterface
{
    public function paginateForAdmin(
        ?string $search = null,
        ?string $role = null,
        int $perPage = 15,
    ): LengthAwarePaginator;
}
