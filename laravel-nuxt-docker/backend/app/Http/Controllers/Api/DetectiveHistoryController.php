<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DetectiveProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DetectiveHistoryController extends Controller
{
    public function __construct(
        private readonly DetectiveProgressService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->completionHistory($request->user()),
        ]);
    }

    public function show(Request $request, int $historyId): JsonResponse
    {
        return response()->json([
            'data' => $this->service->completionHistoryDetail($request->user(), $historyId),
        ]);
    }
}
