<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseAsset;
use App\Models\TowerDefenseEnemy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TowerDefenseEnemyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => TowerDefenseEnemy::query()
                ->orderByRaw("CASE WHEN kind = 'normal' THEN 0 ELSE 1 END")
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $enemy = TowerDefenseEnemy::create($this->validatedData($request));

        return response()->json(['data' => $enemy, 'message' => 'Đã tạo kẻ địch.'], 201);
    }

    public function update(Request $request, TowerDefenseEnemy $enemy): JsonResponse
    {
        $enemy->update($this->validatedData($request, $enemy));

        return response()->json(['data' => $enemy->fresh(), 'message' => 'Đã cập nhật kẻ địch.']);
    }

    public function destroy(TowerDefenseEnemy $enemy): JsonResponse
    {
        $enemy->delete();

        return response()->json(['message' => 'Đã xóa kẻ địch.']);
    }

    private function validatedData(Request $request, ?TowerDefenseEnemy $enemy = null): array
    {
        $data = $request->validate([
            'id' => [$enemy ? 'sometimes' : 'required', 'string', 'max:100', 'regex:/^[a-z0-9-]+$/', Rule::unique('tower_defense_enemies')->ignore($enemy?->id)],
            'name' => ['required', 'string', 'max:255'],
            'kind' => ['required', Rule::in(['normal', 'boss'])],
            'model_asset_key' => ['required', 'string', Rule::exists('tower_defense_assets', 'key')],
            'avatar_asset_key' => ['nullable', 'string', Rule::exists('tower_defense_assets', 'key')],
            'left_weapon_asset_key' => ['nullable', 'string', Rule::exists('tower_defense_assets', 'key')],
            'right_weapon_asset_key' => ['nullable', 'string', Rule::exists('tower_defense_assets', 'key')],
            'base_health' => ['required', 'integer', 'between:1,100000000'],
            'base_speed' => ['required', 'numeric', 'between:0.01,100'],
            'reward' => ['required', 'integer', 'between:0,100000000'],
            'castle_damage' => ['required', 'integer', 'between:1,1000'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'resistance' => ['nullable', 'string', 'max:1000'],
            'weakness' => ['nullable', 'string', 'max:1000'],
            'model_configuration' => ['required', 'array'],
            'model_configuration.characterScale' => ['required', 'numeric', 'gt:0'],
            'model_configuration.sceneScale' => ['required', 'numeric', 'gt:0'],
            'model_configuration.healthBarY' => ['required', 'numeric'],
            'model_configuration.animationNames' => ['present', 'array'],
            'model_configuration.animationNames.*' => ['string', 'max:100'],
            'model_configuration.removeRootMotion' => ['sometimes', 'boolean'],
            'model_configuration.leftWeaponTransform' => ['sometimes', 'array'],
            'model_configuration.leftWeaponTransform.position' => ['required_with:model_configuration.leftWeaponTransform', 'array', 'size:3'],
            'model_configuration.leftWeaponTransform.position.*' => ['numeric', 'between:-100,100'],
            'model_configuration.leftWeaponTransform.rotation' => ['required_with:model_configuration.leftWeaponTransform', 'array', 'size:3'],
            'model_configuration.leftWeaponTransform.rotation.*' => ['numeric', 'between:-20,20'],
            'model_configuration.leftWeaponTransform.scale' => ['required_with:model_configuration.leftWeaponTransform', 'numeric', 'between:0.001,100'],
            'model_configuration.rightWeaponTransform' => ['sometimes', 'array'],
            'model_configuration.rightWeaponTransform.position' => ['required_with:model_configuration.rightWeaponTransform', 'array', 'size:3'],
            'model_configuration.rightWeaponTransform.position.*' => ['numeric', 'between:-100,100'],
            'model_configuration.rightWeaponTransform.rotation' => ['required_with:model_configuration.rightWeaponTransform', 'array', 'size:3'],
            'model_configuration.rightWeaponTransform.rotation.*' => ['numeric', 'between:-20,20'],
            'model_configuration.rightWeaponTransform.scale' => ['required_with:model_configuration.rightWeaponTransform', 'numeric', 'between:0.001,100'],
            'combat_profile' => ['required', 'array'],
            'combat_profile.damageMultipliers' => ['present', 'array'],
            'combat_profile.damageMultipliers.*' => ['numeric', 'between:0,10'],
            'combat_profile.effectDurationMultipliers' => ['present', 'array'],
            'combat_profile.effectDurationMultipliers.*' => ['numeric', 'between:0,10'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $model = TowerDefenseAsset::query()->where('key', $data['model_asset_key'])->first();
        $expectedModelPurpose = $data['kind'] === 'boss' ? 'boss-model' : 'enemy-model';
        if ($model?->purpose !== $expectedModelPurpose) {
            throw ValidationException::withMessages([
                'model_asset_key' => ["Model phải thuộc nhóm {$expectedModelPurpose}."],
            ]);
        }

        if (! empty($data['avatar_asset_key'])) {
            $avatar = TowerDefenseAsset::query()->where('key', $data['avatar_asset_key'])->first();
            $expectedAvatarPurpose = $data['kind'] === 'boss' ? 'boss-avatar' : 'enemy-avatar';
            if ($avatar?->purpose !== $expectedAvatarPurpose) {
                throw ValidationException::withMessages([
                    'avatar_asset_key' => ["Ảnh phải thuộc nhóm {$expectedAvatarPurpose}."],
                ]);
            }
        }

        foreach (['left_weapon_asset_key', 'right_weapon_asset_key'] as $weaponField) {
            if (empty($data[$weaponField])) {
                continue;
            }
            $weapon = TowerDefenseAsset::query()->where('key', $data[$weaponField])->first();
            if ($weapon?->purpose !== 'equipment-model' || ! preg_match('/\.(glb|gltf)$/i', $weapon->key)) {
                throw ValidationException::withMessages([
                    $weaponField => ['Vũ khí phải là file GLB/GLTF thuộc nhóm equipment-model.'],
                ]);
            }
        }

        if ($enemy) {
            unset($data['id']);
        }

        return $data;
    }
}
