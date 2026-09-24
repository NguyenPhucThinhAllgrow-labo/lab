<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseTower;
use Illuminate\Http\JsonResponse;

class TowerDefenseTowerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => TowerDefenseTower::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }
}
