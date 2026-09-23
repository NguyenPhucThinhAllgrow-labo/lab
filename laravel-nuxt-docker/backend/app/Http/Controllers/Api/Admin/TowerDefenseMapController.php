<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseMap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TowerDefenseMapController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => TowerDefenseMap::query()->orderBy('sort_order')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $map = TowerDefenseMap::create($this->validatedData($request));

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
            'configuration.cellSize' => ['required', 'numeric', 'gt:0'],
            'configuration.paths' => ['required', 'array', 'size:2'],
            'configuration.paths.*' => ['required', 'array', 'min:2'],
            'configuration.paths.*.*.x' => ['required', 'integer', 'min:0'],
            'configuration.paths.*.*.y' => ['required', 'integer', 'min:0'],
            'configuration.pathTiles' => ['required', 'array'],
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
            'configuration.camera' => ['required', 'array'],
            'configuration.theme' => ['required', 'array'],
            'configuration.scenery' => ['required', 'array'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
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

        $firstPath = $configuration['paths'][0];
        $secondPath = $configuration['paths'][1];
        $firstEnd = end($firstPath);
        $secondEnd = end($secondPath);
        if ($firstEnd['x'] !== $secondEnd['x'] || $firstEnd['y'] !== $secondEnd['y']) {
            throw ValidationException::withMessages([
                'configuration.paths' => 'Hai lane phải kết thúc tại cùng một cổng lâu đài.',
            ]);
        }

        $configuration['pathTiles'] = array_values($pathTiles);
        $data['configuration'] = $configuration;

        return $data;
    }
}
