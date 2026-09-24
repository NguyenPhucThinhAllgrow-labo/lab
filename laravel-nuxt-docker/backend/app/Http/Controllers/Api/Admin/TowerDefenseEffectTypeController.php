<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseEffectType;
use App\Models\TowerDefenseTower;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TowerDefenseEffectTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            TowerDefenseEffectType::query()->orderBy('sort_order')->orderBy('name')->paginate($this->perPage($request)),
        );
    }

    private function perPage(Request $request): int
    {
        return min(500, max(1, $request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $effectType = TowerDefenseEffectType::create($this->validatedData($request));
        return response()->json(['data' => $effectType, 'message' => 'Đã tạo loại hiệu ứng.'], 201);
    }

    public function update(Request $request, TowerDefenseEffectType $effectType): JsonResponse
    {
        $effectType->update($this->validatedData($request, $effectType));
        TowerDefenseTower::query()->get()->each(function (TowerDefenseTower $tower) use ($effectType): void {
            $effects = $tower->effects ?? [];
            $changed = false;
            $effects['items'] = array_map(function (array $item) use ($effectType, &$changed): array {
                if (($item['type'] ?? null) !== $effectType->id) return $item;
                $changed = true;
                return [...$item, 'behavior' => $effectType->behavior];
            }, $effects['items'] ?? []);
            if ($changed) $tower->update(['effects' => $effects]);
        });
        return response()->json(['data' => $effectType->fresh(), 'message' => 'Đã cập nhật loại hiệu ứng.']);
    }

    public function destroy(TowerDefenseEffectType $effectType): JsonResponse
    {
        $inUse = TowerDefenseTower::query()->get()->contains(fn (TowerDefenseTower $tower) => collect($tower->effects['items'] ?? [])->contains(fn (array $item) => ($item['type'] ?? null) === $effectType->id));
        if ($inUse) return response()->json(['message' => 'Loại hiệu ứng đang được tower sử dụng nên không thể xóa.'], 422);
        $effectType->delete();
        return response()->json(['message' => 'Đã xóa loại hiệu ứng.']);
    }

    private function validatedData(Request $request, ?TowerDefenseEffectType $effectType = null): array
    {
        $data = $request->validate([
            'id' => [$effectType ? 'sometimes' : 'required', 'string', 'max:100', 'regex:/^[a-z0-9-]+$/', Rule::unique('tower_defense_effect_types')->ignore($effectType?->id)],
            'name' => ['required', 'string', 'max:100'],
            'role' => ['required', Rule::in(['damage', 'buff'])],
            'behavior' => ['required', Rule::in(['bonus_damage', 'damage_over_time', 'slow', 'splash_damage', 'damage_aura', 'attack_speed_aura'])],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'sort_order' => ['sometimes', 'integer', 'between:0,100000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if ($effectType) unset($data['id']);
        return $data;
    }
}
