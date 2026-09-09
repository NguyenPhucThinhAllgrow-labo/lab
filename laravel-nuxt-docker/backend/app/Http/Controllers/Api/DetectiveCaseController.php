<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DetectiveCaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DetectiveCaseController extends Controller
{
    public function __construct(
        private readonly DetectiveCaseService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->list($this->locale($request)),
        ]);
    }

    public function show(Request $request, string $caseId): JsonResponse
    {
        return response()->json([
            'data' => $this->service->get($caseId, $this->locale($request)),
        ]);
    }

    private function locale(Request $request): string
    {
        $locale = $request->string('locale')->lower()->value();

        return in_array($locale, ['en', 'vi'], true) ? $locale : 'en';
    }
}
