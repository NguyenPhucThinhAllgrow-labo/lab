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

    public function show(TowerDefenseMap $map): JsonResponse
    {
        return response()->json(['data' => $map]);
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
            'configuration.scenePreset' => ['sometimes', Rule::in(['citadel-of-cinders', 'gothic-swamp'])],
            'configuration.swampSettings' => ['required_if:configuration.scenePreset,gothic-swamp', 'array'],
            'configuration.swampSettings.seed' => ['required_with:configuration.swampSettings', 'integer', 'between:0,1000000'],
            'configuration.swampSettings.treeCount' => ['required_with:configuration.swampSettings', 'integer', 'between:0,180'],
            'configuration.swampSettings.waterColor' => ['required_with:configuration.swampSettings', 'integer', 'between:0,16777215'],
            'configuration.swampSettings.islands' => ['required_with:configuration.swampSettings', 'array', 'max:24'],
            'configuration.swampSettings.islands.*.x' => ['required', 'numeric', 'between:0,99'],
            'configuration.swampSettings.islands.*.y' => ['required', 'numeric', 'between:0,99'],
            'configuration.swampSettings.islands.*.radius' => ['required', 'numeric', 'between:1,8'],
            'configuration.swampSettings.islands.*.spawnArea' => ['sometimes', 'boolean'],
            'configuration.swampSettings.editorPadding' => ['sometimes', 'integer', 'between:0,48'],
            'configuration.swampSettings.bridges' => ['required_with:configuration.swampSettings', 'array', 'max:24'],
            'configuration.swampSettings.bridges.*.from.x' => ['required', 'integer', 'between:0,99'],
            'configuration.swampSettings.bridges.*.from.y' => ['required', 'integer', 'between:0,99'],
            'configuration.swampSettings.bridges.*.to.x' => ['required', 'integer', 'between:0,99'],
            'configuration.swampSettings.bridges.*.to.y' => ['required', 'integer', 'between:0,99'],
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
            'configuration.castle.maxSize' => ['sometimes', 'numeric', 'between:0.1,200'],
            'configuration.castle.modelOffset' => ['sometimes', 'array'],
            'configuration.castle.modelOffset.x' => ['required_with:configuration.castle.modelOffset', 'numeric', 'between:-1000,1000'],
            'configuration.castle.modelOffset.z' => ['required_with:configuration.castle.modelOffset', 'numeric', 'between:-1000,1000'],
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

        if (($configuration['scenePreset'] ?? null) === 'gothic-swamp') {
            $padding = (int) ($configuration['swampSettings']['editorPadding'] ?? 0);
            if ($columns - 2 * $padding < 4 || $rows - 2 * $padding < 4) {
                throw ValidationException::withMessages([
                    'configuration.swampSettings.editorPadding' => 'Vùng mở rộng phải giữ lại tối thiểu 4 ô mỗi chiều cho map gốc.',
                ]);
            }
            foreach ($configuration['swampSettings']['islands'] as $index => $island) {
                if ($island['x'] >= $columns || $island['y'] >= $rows) {
                    throw ValidationException::withMessages([
                        "configuration.swampSettings.islands.{$index}" => 'Đảo phải nằm trong kích thước map.',
                    ]);
                }
            }
            foreach ($configuration['swampSettings']['bridges'] as $index => $bridge) {
                foreach (['from', 'to'] as $end) {
                    if ($bridge[$end]['x'] >= $columns || $bridge[$end]['y'] >= $rows) {
                        throw ValidationException::withMessages([
                            "configuration.swampSettings.bridges.{$index}.{$end}" => 'Đầu cầu phải nằm trong kích thước map.',
                        ]);
                    }
                }
                if ($bridge['from'] === $bridge['to'] ||
                    ($bridge['from']['x'] !== $bridge['to']['x'] && $bridge['from']['y'] !== $bridge['to']['y'])) {
                    throw ValidationException::withMessages([
                        "configuration.swampSettings.bridges.{$index}" => 'Cầu phải có hai đầu khác nhau, cùng hàng hoặc cùng cột.',
                    ]);
                }
            }
        }

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
        // Explicit citadel pads may occupy the bridge deck, even on a lane.
        if (($configuration['scenePreset'] ?? null) === 'citadel-of-cinders') {
            $bridge = $configuration['sceneSettings']['bridge'] ?? [];
            $lava = $configuration['sceneSettings']['lava'] ?? [];
            $cellSize = $configuration['cellSize'];
            $start = (int) round((($bridge['castleEdgeX'] ?? 32) - ($bridge['length'] ?? 72) + ($lava['width'] ?? 180) / 2) / $cellSize);
            $center = (int) floor($rows / 2);
            $halfRows = (($bridge['paverRows'] ?? 3) - 1) / 2;
            foreach ($pathTiles as $key => $point) {
                if ($point['x'] >= $start && $point['x'] < $start + ($bridge['paverColumns'] ?? 36)
                    && abs($point['y'] - $center) <= $halfRows) {
                    unset($blockedBuildableTiles[$key]);
                }
            }
        }
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
        $data['configuration'] = $configuration;

        return $data;
    }
}
