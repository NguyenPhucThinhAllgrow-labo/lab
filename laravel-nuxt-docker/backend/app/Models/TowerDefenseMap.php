<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TowerDefenseMap extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'configuration',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'configuration' => 'array',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function definition(): array
    {
        $configuration = array_replace([
            'startingCredits' => 3000,
        ], $this->configuration);
        $configuration = $this->hydrateEnemyRoster($configuration, 'enemy');
        $configuration = $this->hydrateEnemyRoster($configuration, 'boss');
        $configuration = $this->hydrateEnemy($configuration, 'enemy');
        $configuration = $this->hydrateEnemy($configuration, 'boss');

        return array_replace($configuration, [
            'id' => $this->id,
            'name' => $this->name,
        ]);
    }

    private function hydrateEnemyRoster(array $configuration, string $slot): array
    {
        $idsKey = "{$slot}DefinitionIds";
        $definitionsKey = "{$slot}Definitions";
        $ids = $configuration[$idsKey] ?? [];
        if (! is_array($ids) || $ids === []) {
            $legacyId = $configuration["{$slot}Definition"]['id'] ?? null;
            $ids = is_string($legacyId) ? [$legacyId] : [];
        }
        $ids = array_values(array_unique(array_filter($ids, 'is_string')));
        if ($ids === []) {
            return $configuration;
        }

        $enemies = TowerDefenseEnemy::query()
            ->whereIn('id', $ids)
            ->where('kind', $slot === 'boss' ? 'boss' : 'normal')
            ->where('is_active', true)
            ->get()
            ->keyBy('id');
        $definitions = [];
        foreach ($ids as $id) {
            $enemy = $enemies->get($id);
            if ($enemy) {
                $definitions[] = $this->serializeEnemy($enemy);
            }
        }
        if ($definitions === []) {
            return $configuration;
        }

        $configuration[$idsKey] = array_column($definitions, 'id');
        $configuration[$definitionsKey] = $definitions;
        $configuration["{$slot}Definition"] = $definitions[0];
        $configuration["{$slot}Model"] = $definitions[0]['model'];
        $configuration["{$slot}Intel"] = $definitions[0]['intel'];

        return $configuration;
    }

    private function serializeEnemy(TowerDefenseEnemy $enemy): array
    {
        $assetUrl = static fn (?string $key): string => $key
            ? '/api/tower-defense/assets/'.str_replace('%2F', '/', rawurlencode($key))
            : '';

        return [
            'id' => $enemy->id,
            'name' => $enemy->name,
            'kind' => $enemy->kind,
            'baseHealth' => $enemy->base_health,
            'baseSpeed' => $enemy->base_speed,
            'reward' => $enemy->reward,
            'castleDamage' => $enemy->castle_damage,
            'combatProfile' => $enemy->combat_profile,
            'model' => array_replace($enemy->model_configuration ?? [], [
                'url' => $assetUrl($enemy->model_asset_key),
                'leftWeaponUrl' => $assetUrl($enemy->left_weapon_asset_key),
                'rightWeaponUrl' => $assetUrl($enemy->right_weapon_asset_key),
            ]),
            'intel' => [
                'name' => $enemy->name,
                'avatarUrl' => $assetUrl($enemy->avatar_asset_key),
                'summary' => $enemy->summary ?? '',
                'resistance' => $enemy->resistance ?? 'Không',
                'weakness' => $enemy->weakness ?? 'Không',
            ],
        ];
    }

    private function hydrateEnemy(array $configuration, string $slot): array
    {
        if (! empty($configuration["{$slot}Definitions"])) {
            return $configuration;
        }
        $definitionKey = "{$slot}Definition";
        $enemyId = $configuration[$definitionKey]['id'] ?? null;
        if (! is_string($enemyId) || $enemyId === '') {
            return $configuration;
        }

        $enemy = TowerDefenseEnemy::query()
            ->whereKey($enemyId)
            ->where('is_active', true)
            ->first();
        if (! $enemy) {
            return $configuration;
        }

        $assetUrl = static fn (?string $key): string => $key
            ? '/api/tower-defense/assets/'.str_replace('%2F', '/', rawurlencode($key))
            : '';
        $configuration[$definitionKey] = [
            'id' => $enemy->id,
            'baseHealth' => $enemy->base_health,
            'baseSpeed' => $enemy->base_speed,
            'reward' => $enemy->reward,
            'castleDamage' => $enemy->castle_damage,
            'combatProfile' => $enemy->combat_profile,
        ];
        $configuration["{$slot}Model"] = array_replace(
            $enemy->model_configuration ?? [],
            [
                'url' => $assetUrl($enemy->model_asset_key),
                'leftWeaponUrl' => $assetUrl($enemy->left_weapon_asset_key),
                'rightWeaponUrl' => $assetUrl($enemy->right_weapon_asset_key),
            ],
        );
        $configuration["{$slot}Intel"] = [
            'name' => $enemy->name,
            'avatarUrl' => $assetUrl($enemy->avatar_asset_key),
            'summary' => $enemy->summary ?? '',
            'resistance' => $enemy->resistance ?? 'Không',
            'weakness' => $enemy->weakness ?? 'Không',
        ];
        if ($slot === 'boss') {
            $configuration['bossCombatProfileKey'] = $enemy->id === 'lava-overlord'
                ? 'lava-boss'
                : 'normal';
        }

        return $configuration;
    }
}
