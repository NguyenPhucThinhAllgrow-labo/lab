<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\DetectiveLeaderboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DetectiveLeaderboardController extends Controller
{
    public function __construct(
        private readonly DetectiveLeaderboardService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => ['nullable', 'string', Rule::exists('detective_cases', 'id')],
            'limit' => ['nullable', 'integer', 'between:1,250'],
            'locale' => ['nullable', Rule::in(['vi', 'en'])],
        ]);

        return response()->json([
            'data' => $this->service->get(
                $validated['case_id'] ?? null,
                (int) ($validated['limit'] ?? 100),
                $validated['locale'] ?? 'vi',
            ),
        ]);
    }
}
