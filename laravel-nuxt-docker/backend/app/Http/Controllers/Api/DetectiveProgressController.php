<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveDetectiveProgressRequest;
use App\Services\DetectiveProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DetectiveProgressController extends Controller
{
    public function __construct(
        private readonly DetectiveProgressService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->listForUser($request->user()),
        ]);
    }

    public function show(Request $request, string $caseId): JsonResponse
    {
        return response()->json([
            'data' => $this->service->getForUser($request->user(), $caseId),
        ]);
    }

    public function update(SaveDetectiveProgressRequest $request, string $caseId): JsonResponse
    {
        $progress = $this->service->saveForUser(
            $request->user(),
            $caseId,
            $request->validated(),
        );

        return response()->json([
            'message' => 'Detective progress saved.',
            'data' => $progress->fresh(),
        ]);
    }

    public function destroy(Request $request, string $caseId): JsonResponse
    {
        $this->service->resetForUser($request->user(), $caseId);

        return response()->json(['message' => 'Detective progress reset.']);
    }
}
