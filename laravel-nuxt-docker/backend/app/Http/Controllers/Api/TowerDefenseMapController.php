<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseMap;
use App\Models\TowerDefenseProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TowerDefenseMapController extends Controller
{
    private const COMPLETION_WAVE = 20;

    public function index(Request $request): JsonResponse
    {
        $maps = $this->activeMaps();
        $progress = $this->progressFor($request);

        return response()->json([
            'data' => $maps->values()->map(
                fn (TowerDefenseMap $map, int $index): array => $this->definitionWithProgress(
                    $map,
                    $index,
                    $maps,
                    $progress,
                ),
            ),
            'completionWave' => self::COMPLETION_WAVE,
        ]);
    }

    public function show(Request $request, TowerDefenseMap $map): JsonResponse
    {
        abort_unless($map->is_active, 404);
        $maps = $this->activeMaps();
        $index = $maps->search(fn (TowerDefenseMap $item): bool => $item->id === $map->id);
        abort_if($index === false, 404);
        $progress = $this->progressFor($request);
        abort_unless($this->isUnlocked((int) $index, $maps, $progress), 403, 'Map chưa được mở khóa.');

        return response()->json([
            'data' => $this->definitionWithProgress($map, (int) $index, $maps, $progress),
            'completionWave' => self::COMPLETION_WAVE,
        ]);
    }

    public function recordProgress(Request $request, TowerDefenseMap $map): JsonResponse
    {
        abort_unless($map->is_active, 404);
        $validated = $request->validate([
            'wave' => ['required', 'integer', 'between:1,10000'],
        ]);
        $maps = $this->activeMaps();
        $index = $maps->search(fn (TowerDefenseMap $item): bool => $item->id === $map->id);
        abort_if($index === false, 404);
        $progressByMap = $this->progressFor($request);
        abort_unless($this->isUnlocked((int) $index, $maps, $progressByMap), 403, 'Map chưa được mở khóa.');

        $progress = TowerDefenseProgress::query()->firstOrNew([
            'user_id' => $request->user()->id,
            'tower_defense_map_id' => $map->id,
        ]);
        $progress->max_wave = max($progress->max_wave ?? 0, (int) $validated['wave']);
        if ($progress->max_wave >= self::COMPLETION_WAVE && ! $progress->completed_at) {
            $progress->completed_at = now();
        }
        $progress->save();

        $nextMap = $progress->max_wave >= self::COMPLETION_WAVE
            ? $maps->get((int) $index + 1)
            : null;

        return response()->json([
            'message' => $nextMap
                ? "Đã mở khóa {$nextMap->name}."
                : ($progress->completed_at ? 'Đã hoàn thành map.' : 'Đã lưu tiến trình.'),
            'data' => [
                'mapId' => $map->id,
                'maxWave' => $progress->max_wave,
                'completed' => $progress->completed_at !== null,
                'completedAt' => $progress->completed_at?->toISOString(),
                'unlockedMap' => $nextMap ? ['id' => $nextMap->id, 'name' => $nextMap->name] : null,
            ],
            'completionWave' => self::COMPLETION_WAVE,
        ]);
    }

    private function activeMaps(): Collection
    {
        return TowerDefenseMap::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    private function progressFor(Request $request): Collection
    {
        $user = $request->user('sanctum');
        if (! $user) {
            return collect();
        }

        return TowerDefenseProgress::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('tower_defense_map_id');
    }

    private function definitionWithProgress(
        TowerDefenseMap $map,
        int $index,
        Collection $maps,
        Collection $progress,
    ): array {
        $mapProgress = $progress->get($map->id);

        return array_replace($map->definition(), [
            'isUnlocked' => $this->isUnlocked($index, $maps, $progress),
            'bestWave' => $mapProgress?->max_wave ?? 0,
            'completed' => $mapProgress?->completed_at !== null,
            'completionWave' => self::COMPLETION_WAVE,
        ]);
    }

    private function isUnlocked(int $index, Collection $maps, Collection $progress): bool
    {
        if ($index === 0) {
            return true;
        }

        $previousMap = $maps->get($index - 1);
        $previousProgress = $previousMap ? $progress->get($previousMap->id) : null;

        return ($previousProgress?->max_wave ?? 0) >= self::COMPLETION_WAVE;
    }
}
