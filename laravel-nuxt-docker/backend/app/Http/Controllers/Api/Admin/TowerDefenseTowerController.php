<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseAsset;
use App\Models\TowerDefenseTower;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TowerDefenseTowerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => TowerDefenseTower::query()->orderBy('sort_order')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tower = TowerDefenseTower::create($this->validatedData($request));

        return response()->json(['data' => $tower, 'message' => 'Đã tạo tower.'], 201);
    }

    public function update(Request $request, TowerDefenseTower $tower): JsonResponse
    {
        $tower->update($this->validatedData($request, $tower));

        return response()->json(['data' => $tower->fresh(), 'message' => 'Đã cập nhật tower.']);
    }

    public function destroy(TowerDefenseTower $tower): JsonResponse
    {
        $tower->delete();

        return response()->json(['message' => 'Đã xóa tower.']);
    }

    private function validatedData(Request $request, ?TowerDefenseTower $tower = null): array
    {
        $data = $request->validate([
            'id' => [$tower ? 'sometimes' : 'required', 'string', Rule::in(['archer', 'cannon', 'frost', 'fire', 'thunder', 'water', 'speed', 'damage']), Rule::unique('tower_defense_towers')->ignore($tower?->id)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'cost' => ['required', 'integer', 'between:0,100000000'],
            'damage' => ['required', 'numeric', 'between:0,100000000'],
            'range' => ['required', 'numeric', 'between:0.01,100'],
            'fire_rate' => ['required', 'numeric', 'between:0,100'],
            'color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'effects' => ['present', 'array'],
            'effects.slow' => ['sometimes', 'numeric', 'between:0,1'],
            'effects.slowDuration' => ['sometimes', 'numeric', 'between:0,100'],
            'effects.burnDuration' => ['sometimes', 'numeric', 'between:0,100'],
            'effects.burnDamagePerSecond' => ['sometimes', 'numeric', 'between:0,1000000'],
            'effects.splashRadius' => ['sometimes', 'numeric', 'between:0,100'],
            'effects.splashDamageRatio' => ['sometimes', 'numeric', 'between:0,1'],
            'model_asset_keys' => ['present', 'array'],
            'model_asset_keys.*' => ['nullable', 'string', Rule::exists('tower_defense_assets', 'key')],
            'model_configuration' => ['required', 'array'],
            'model_configuration.targetHeight' => ['required', 'numeric', 'between:0.01,100'],
            'sort_order' => ['sometimes', 'integer', 'between:0,100000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        foreach (array_filter($data['model_asset_keys']) as $key) {
            $asset = TowerDefenseAsset::query()->where('key', $key)->first();
            if ($asset?->purpose !== 'tower-model' || ! preg_match('/\.(glb|gltf)$/i', $key)) {
                throw ValidationException::withMessages([
                    'model_asset_keys' => ['Model tower phải là file GLB/GLTF thuộc nhóm tower-model.'],
                ]);
            }
        }

        $data['model_asset_keys'] = array_filter($data['model_asset_keys']);
        if ($tower) {
            unset($data['id']);
        }

        return $data;
    }
}
