<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function __construct(
        private readonly AdminUserService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::in(['admin', 'user'])],
            'per_page' => ['nullable', 'integer', 'between:5,100'],
        ]);

        return response()->json([
            'data' => $this->service->list(
                $validated['search'] ?? null,
                $validated['role'] ?? null,
                (int) ($validated['per_page'] ?? 15),
            ),
        ]);
    }
}
