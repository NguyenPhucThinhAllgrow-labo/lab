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

    public function best(Request $request): JsonResponse
    {
        $validated = $this->validateListRequest($request);

        return response()->json([
            'data' => $this->service->best(
                $validated['case_id'] ?? null,
                (int) ($validated['per_page'] ?? 25),
                (int) ($validated['page'] ?? 1),
                $validated['locale'] ?? 'vi',
            ),
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $validated = $this->validateListRequest($request, true);

        return response()->json([
            'data' => $this->service->history(
                $validated['case_id'] ?? null,
                $validated['search'] ?? null,
                (int) ($validated['per_page'] ?? 25),
                (int) ($validated['page'] ?? 1),
                $validated['locale'] ?? 'vi',
            ),
        ]);
    }

    private function validateListRequest(Request $request, bool $withSearch = false): array
    {
        $rules = [
            'case_id' => ['nullable', 'string', Rule::exists('detective_cases', 'id')],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'locale' => ['nullable', Rule::in(['vi', 'en'])],
        ];

        if ($withSearch) {
            $rules['search'] = ['nullable', 'string', 'max:255'];
        }

        return $request->validate($rules);
    }
}
