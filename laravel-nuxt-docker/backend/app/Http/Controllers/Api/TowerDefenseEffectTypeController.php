<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseEffectType;
use Illuminate\Http\JsonResponse;

class TowerDefenseEffectTypeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => TowerDefenseEffectType::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get()]);
    }
}
