<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseMap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TowerDefenseMapController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            TowerDefenseMap::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->paginate($this->perPage($request)),
        );
    }

    private function perPage(Request $request): int
    {
        return min(500, max(1, $request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedData($request);
        $map = DB::transaction(function () use ($data): TowerDefenseMap {
            $lastSortOrder = TowerDefenseMap::query()
                ->orderByDesc('sort_order')
                ->lockForUpdate()
                ->value('sort_order');
            $data['sort_order'] = $lastSortOrder === null
                ? 0
                : (int) $lastSortOrder + 1;

            return TowerDefenseMap::create($data);
        });

        return response()->json(['data' => $map, 'message' => 'Đã tạo map.'], 201);
    }

    public function update(Request $request, TowerDefenseMap $map): JsonResponse
    {
        $map->update($this->validatedData($request, $map));

        return response()->json(['data' => $map->fresh(), 'message' => 'Đã cập nhật map.']);
    }

    public function destroy(TowerDefenseMap $map): JsonResponse
    {
        $map->delete();

        return response()->json(['message' => 'Đã xóa map.']);
    }

    private function rules(?TowerDefenseMap $map = null): array
    {
        return [
            'id' => [$map ? 'sometimes' : 'required', 'string', 'max:100', 'regex:/^[a-z0-9-]+$/', Rule::unique('tower_defense_maps')->ignore($map?->id)],
            'name' => ['required', 'string', 'max:255'],
            'configuration' => ['required', 'array'],
            'configuration.columns' => ['required', 'integer', 'between:4,100'],
            'configuration.rows' => ['required', 'integer', 'between:4,100'],
            'configuration.maxTowerCount' => ['required', 'integer', 'between:1,1000'],
            'configuration.startingCredits' => ['sometimes', 'integer', 'between:0,10000000'],
            'configuration.bossOnly' => ['sometimes', 'boolean'],
            'configuration.environmentMode' => ['sometimes', Rule::in(['normal', 'dark'])],
            'configuration.worldStyle' => ['sometimes', Rule::in(['ground', 'gothic-abyss'])],
            'configuration.cellSize' => ['required', 'numeric', 'gt:0'],
            'configuration.spawnPoints' => ['sometimes', 'array', 'size:2'],
            'configuration.spawnPoints.*.x' => ['required_with:configuration.spawnPoints', 'integer', 'min:0'],
            'configuration.spawnPoints.*.y' => ['required_with:configuration.spawnPoints', 'integer', 'min:0'],
            'configuration.paths' => ['required', 'array', 'size:2'],
            'configuration.paths.*' => ['required', 'array', 'min:2'],
            'configuration.paths.*.*.x' => ['required', 'integer', 'min:0'],
            'configuration.paths.*.*.y' => ['required', 'integer', 'min:0'],
            'configuration.pathTiles' => ['required', 'array'],
            'configuration.buildableTiles' => ['sometimes', 'array', 'max:10000'],
            'configuration.buildableTiles.*.x' => ['required', 'integer', 'min:0'],
            'configuration.buildableTiles.*.y' => ['required', 'integer', 'min:0'],
            'configuration.terrainTiles' => ['sometimes', 'array', 'max:10000'],
            'configuration.terrainTiles.*.x' => ['required', 'integer', 'min:0'],
            'configuration.terrainTiles.*.y' => ['required', 'integer', 'min:0'],
            'configuration.terrainTiles.*.type' => ['required', Rule::in([
                'grass', 'stone', 'basalt', 'lava', 'sand', 'snow',
            ])],
            'configuration.structures' => ['sometimes', 'array', 'max:1000'],
            'configuration.structures.*.x' => ['required', 'integer', 'min:0'],
            'configuration.structures.*.y' => ['required', 'integer', 'min:0'],
            'configuration.structures.*.type' => ['required', Rule::in([
                'wall', 'watchtower', 'arch', 'gatehouse', 'fortress',
                'ruin', 'rock', 'dead-tree', 'burning-tree',
            ])],
            'configuration.structures.*.rotation' => ['sometimes', 'numeric', 'between:0,6.2832'],
            'configuration.structures.*.scale' => ['sometimes', 'numeric', 'between:0.5,2'],
            'configuration.cornerRadius' => ['required', 'numeric', 'min:0'],
            'configuration.enemyDefinitionIds' => ['required', 'array', 'min:1', 'max:50'],
            'configuration.enemyDefinitionIds.*' => [
                'required',
                'string',
                'distinct:strict',
                Rule::exists('tower_defense_enemies', 'id')->where(
                    fn ($query) => $query
                        ->where('kind', 'normal')
                        ->where('is_active', true),
                ),
            ],
            'configuration.bossDefinitionIds' => ['required', 'array', 'min:1', 'max:50'],
            'configuration.bossDefinitionIds.*' => [
                'required',
                'string',
                'distinct:strict',
                Rule::exists('tower_defense_enemies', 'id')->where(
                    fn ($query) => $query
                        ->where('kind', 'boss')
                        ->where('is_active', true),
                ),
            ],
            'configuration.castle' => ['required', 'array'],
            'configuration.castle.position' => ['sometimes', 'array'],
            'configuration.castle.position.x' => ['required_with:configuration.castle.position', 'integer', 'min:0'],
            'configuration.castle.position.y' => ['required_with:configuration.castle.position', 'integer', 'min:0'],
            'configuration.camera' => ['required', 'array'],
            'configuration.theme' => ['required', 'array'],
            'configuration.scenery' => ['required', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    private function validatedData(
        Request $request,
        ?TowerDefenseMap $map = null,
    ): array {
        $data = $request->validate($this->rules($map));
        // Configuration là tài liệu JSON mở rộng. Giữ các khóa nội dung do
        // admin quản lý (model, intel, audio...) sau khi phần lõi đã hợp lệ.
        $data['configuration'] = $request->input('configuration');
        $configuration = $data['configuration'];
        $columns = (int) $configuration['columns'];
        $rows = (int) $configuration['rows'];
        $pathTiles = [];

        foreach ($configuration['spawnPoints'] ?? [] as $laneIndex => $point) {
            if ((int) $point['x'] >= $columns || (int) $point['y'] >= $rows) {
                throw ValidationException::withMessages([
                    "configuration.spawnPoints.{$laneIndex}" => 'Vị trí cổng phải nằm trong kích thước map.',
                ]);
            }
        }

        if (isset($configuration['castle']['position'])) {
            $castlePosition = $configuration['castle']['position'];
            if ((int) $castlePosition['x'] >= $columns || (int) $castlePosition['y'] >= $rows) {
                throw ValidationException::withMessages([
                    'configuration.castle.position' => 'Vị trí lâu đài phải nằm trong kích thước map.',
                ]);
            }
        }

        foreach ($configuration['paths'] as $laneIndex => $path) {
            foreach ($path as $pointIndex => $point) {
                $x = (int) $point['x'];
                $y = (int) $point['y'];
                if ($x >= $columns || $y >= $rows) {
                    throw ValidationException::withMessages([
                        "configuration.paths.{$laneIndex}.{$pointIndex}" => 'Ô đường đi nằm ngoài kích thước map.',
                    ]);
                }

                if ($pointIndex > 0) {
                    $previous = $path[$pointIndex - 1];
                    $distance = abs($x - (int) $previous['x'])
                        + abs($y - (int) $previous['y']);
                    if ($distance !== 1) {
                        throw ValidationException::withMessages([
                            "configuration.paths.{$laneIndex}.{$pointIndex}" => 'Các ô đường đi phải liền nhau theo hàng hoặc cột.',
                        ]);
                    }
                }

                $pathTiles["{$x}:{$y}"] = ['x' => $x, 'y' => $y];
            }
        }

        $blockedBuildableTiles = $pathTiles;
        foreach ($configuration['spawnPoints'] ?? [] as $point) {
            $blockedBuildableTiles["{$point['x']}:{$point['y']}"] = true;
        }
        if (isset($configuration['castle']['position'])) {
            $point = $configuration['castle']['position'];
            $blockedBuildableTiles["{$point['x']}:{$point['y']}"] = true;
        }

        $buildableTiles = [];
        foreach ($configuration['buildableTiles'] ?? [] as $pointIndex => $point) {
            $x = (int) $point['x'];
            $y = (int) $point['y'];
            if ($x >= $columns || $y >= $rows) {
                throw ValidationException::withMessages([
                    "configuration.buildableTiles.{$pointIndex}" => 'Bệ đặt trụ phải nằm trong kích thước map.',
                ]);
            }

            $key = "{$x}:{$y}";
            if (isset($blockedBuildableTiles[$key])) {
                throw ValidationException::withMessages([
                    "configuration.buildableTiles.{$pointIndex}" => 'Bệ đặt trụ không được trùng đường đi, cổng spawn hoặc cổng lâu đài.',
                ]);
            }
            if (isset($buildableTiles[$key])) {
                throw ValidationException::withMessages([
                    "configuration.buildableTiles.{$pointIndex}" => 'Bệ đặt trụ bị trùng tọa độ.',
                ]);
            }
            $buildableTiles[$key] = ['x' => $x, 'y' => $y];
        }

        $terrainTiles = [];
        foreach ($configuration['terrainTiles'] ?? [] as $pointIndex => $point) {
            $x = (int) $point['x'];
            $y = (int) $point['y'];
            if ($x >= $columns || $y >= $rows) {
                throw ValidationException::withMessages([
                    "configuration.terrainTiles.{$pointIndex}" => 'Ô địa hình phải nằm trong kích thước map.',
                ]);
            }
            $key = "{$x}:{$y}";
            if (isset($terrainTiles[$key])) {
                throw ValidationException::withMessages([
                    "configuration.terrainTiles.{$pointIndex}" => 'Ô địa hình bị trùng tọa độ.',
                ]);
            }
            $terrainTiles[$key] = [
                'x' => $x,
                'y' => $y,
                'type' => $point['type'],
            ];
        }

        $blockedStructures = $blockedBuildableTiles;
        foreach ($buildableTiles as $key => $_point) {
            $blockedStructures[$key] = true;
        }
        $structures = [];
        foreach ($configuration['structures'] ?? [] as $pointIndex => $point) {
            $x = (int) $point['x'];
            $y = (int) $point['y'];
            if ($x >= $columns || $y >= $rows) {
                throw ValidationException::withMessages([
                    "configuration.structures.{$pointIndex}" => 'Công trình phải nằm trong kích thước map.',
                ]);
            }
            $key = "{$x}:{$y}";
            if (isset($blockedStructures[$key])) {
                throw ValidationException::withMessages([
                    "configuration.structures.{$pointIndex}" => 'Công trình không được chắn đường, bệ trụ hoặc cổng.',
                ]);
            }
            if (isset($structures[$key])) {
                throw ValidationException::withMessages([
                    "configuration.structures.{$pointIndex}" => 'Công trình bị trùng tọa độ.',
                ]);
            }
            $structures[$key] = array_filter([
                'x' => $x,
                'y' => $y,
                'type' => $point['type'],
                'rotation' => isset($point['rotation']) ? (float) $point['rotation'] : null,
                'scale' => isset($point['scale']) ? (float) $point['scale'] : null,
            ], static fn ($value) => $value !== null);
        }

        $firstPath = $configuration['paths'][0];
        $secondPath = $configuration['paths'][1];
        $firstEnd = end($firstPath);
        $secondEnd = end($secondPath);
        if (
            ! isset($configuration['castle']['position']) &&
            ($firstEnd['x'] !== $secondEnd['x'] || $firstEnd['y'] !== $secondEnd['y'])
        ) {
            throw ValidationException::withMessages([
                'configuration.paths' => 'Hai lane phải kết thúc tại cùng một cổng lâu đài.',
            ]);
        }

        $configuration['pathTiles'] = array_values($pathTiles);
        if (array_key_exists('buildableTiles', $configuration))
            $configuration['buildableTiles'] = array_values($buildableTiles);
        if (array_key_exists('terrainTiles', $configuration))
            $configuration['terrainTiles'] = array_values($terrainTiles);
        if (array_key_exists('structures', $configuration))
            $configuration['structures'] = array_values($structures);
        $data['configuration'] = $configuration;

        return $data;
    }
}
