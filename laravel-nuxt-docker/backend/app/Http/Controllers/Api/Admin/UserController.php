<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminUserService;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function __construct(
        private readonly AdminUserService $service,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $user = User::create($data);
        return response()->json(['data' => $user, 'message' => 'Đã tạo người dùng.'], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate($this->rules($user));
        if ($request->user()->id === $user->id && $data['role'] !== 'admin') {
            return response()->json(['message' => 'Bạn không thể tự bỏ quyền quản trị của mình.'], 422);
        }
        if (empty($data['password'])) unset($data['password']);
        DB::transaction(function () use ($user, $data) {
            if ($data['email'] !== $user->email) $user->email_verified_at = null;
            $user->fill($data)->save();
            if (isset($data['password'])) $user->tokens()->delete();
        });
        return response()->json(['data' => $user, 'message' => 'Đã cập nhật người dùng.']);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Bạn không thể xóa tài khoản đang đăng nhập.'], 422);
        }
        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->delete();
        });
        return response()->json(['message' => 'Đã xóa người dùng.']);
    }

    private function rules(?User $user = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user?->id)],
            'role' => ['required', Rule::in(['admin', 'user'])],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8', 'max:255', 'confirmed'],
        ];
    }

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
