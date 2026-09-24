<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseGameSession;
use App\Models\TowerDefenseMap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TowerDefenseGameSessionController extends Controller
{
    private const MAX_SNAPSHOT_BYTES = 4_000_000;

    public function active(Request $request, TowerDefenseMap $map): JsonResponse
    {
        abort_unless($map->is_active, 404);
        $session = TowerDefenseGameSession::query()
            ->where('user_id', $request->user()->id)
            ->where('tower_defense_map_id', $map->id)
            ->where('status', 'active')
            ->latest('last_played_at')
            ->first();

        return response()->json([
            'data' => $session ? $this->serialize($session, true) : null,
        ]);
    }

    public function save(Request $request, TowerDefenseMap $map): JsonResponse
    {
        abort_unless($map->is_active, 404);
        $validated = $request->validate([
            'faction' => ['required', Rule::in(['human', 'dark'])],
            'snapshot' => ['required', 'array'],
            'snapshot.version' => ['required', 'integer', Rule::in([1])],
            'snapshot.mapId' => ['required', 'string', Rule::in([$map->id])],
            'snapshot.phase' => ['required', Rule::in(['ready', 'wave', 'between', 'completed', 'gameover'])],
            'snapshot.wave' => ['required', 'integer', 'between:0,10000'],
            'snapshot.score' => ['required', 'integer', 'min:0'],
            'snapshot.castleHealth' => ['required', 'integer', 'between:0,100000'],
            'snapshot.towers' => ['present', 'array', 'max:500'],
            'snapshot.enemies' => ['present', 'array', 'max:5000'],
        ]);
        $snapshot = $request->input('snapshot');
        $encoded = json_encode($snapshot, JSON_THROW_ON_ERROR);
        if (strlen($encoded) > self::MAX_SNAPSHOT_BYTES) {
            throw ValidationException::withMessages([
                'snapshot' => ['Dữ liệu phiên chơi vượt quá giới hạn cho phép.'],
            ]);
        }

        $phase = $snapshot['phase'];
        $status = in_array($phase, ['completed', 'gameover'], true) ? $phase : 'active';
        $now = now();

        $session = DB::transaction(function () use ($request, $map, $validated, $snapshot, $status, $now): TowerDefenseGameSession {
            $session = TowerDefenseGameSession::query()
                ->where('user_id', $request->user()->id)
                ->where('tower_defense_map_id', $map->id)
                ->where('status', 'active')
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if (! $session) {
                $session = new TowerDefenseGameSession([
                    'user_id' => $request->user()->id,
                    'tower_defense_map_id' => $map->id,
                    'started_at' => $now,
                ]);
            }

            $session->fill([
                'faction' => $validated['faction'],
                'status' => $status,
                'current_wave' => $snapshot['wave'],
                'score' => $snapshot['score'],
                'castle_health' => $snapshot['castleHealth'],
                'snapshot' => $snapshot,
                'last_played_at' => $now,
                'finished_at' => $status === 'active' ? null : $now,
            ]);
            $session->save();

            return $session;
        });

        return response()->json([
            'message' => $status === 'active' ? 'Đã lưu phiên chơi.' : 'Đã lưu kết quả trận đấu.',
            'data' => $this->serialize($session, false),
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $limit = min(100, max(1, (int) $request->integer('limit', 30)));
        $sessions = TowerDefenseGameSession::query()
            ->with('map:id,name')
            ->where('user_id', $request->user()->id)
            ->whereIn('status', ['completed', 'gameover'])
            ->latest('finished_at')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $sessions->map(fn (TowerDefenseGameSession $session): array => [
                ...$this->serialize($session, false),
                'mapName' => $session->map?->name ?? $session->tower_defense_map_id,
            ]),
        ]);
    }

    private function serialize(TowerDefenseGameSession $session, bool $includeSnapshot): array
    {
        return array_filter([
            'id' => $session->id,
            'mapId' => $session->tower_defense_map_id,
            'faction' => $session->faction,
            'status' => $session->status,
            'currentWave' => $session->current_wave,
            'score' => $session->score,
            'castleHealth' => $session->castle_health,
            'startedAt' => $session->started_at?->toISOString(),
            'lastPlayedAt' => $session->last_played_at?->toISOString(),
            'finishedAt' => $session->finished_at?->toISOString(),
            'snapshot' => $includeSnapshot ? $session->snapshot : null,
        ], static fn (mixed $value): bool => $value !== null);
    }
}
