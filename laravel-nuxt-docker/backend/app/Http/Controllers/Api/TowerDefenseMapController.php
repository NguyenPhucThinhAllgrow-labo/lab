<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseMap;
use Illuminate\Http\JsonResponse;

class TowerDefenseMapController extends Controller
{
    public function index(): JsonResponse
    {
        $maps = TowerDefenseMap::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (TowerDefenseMap $map): array => $map->definition());

        return response()->json(['data' => $maps]);
    }

    public function show(TowerDefenseMap $map): JsonResponse
    {
        abort_unless($map->is_active, 404);

        return response()->json(['data' => $map->definition()]);
    }
}
