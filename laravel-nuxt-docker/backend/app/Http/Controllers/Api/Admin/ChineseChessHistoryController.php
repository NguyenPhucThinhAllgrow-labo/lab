<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChineseChessRound;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ChineseChessHistoryController extends Controller
{
    public function show(ChineseChessRound $round): JsonResponse
    {
        $round->load(['room:id,code', 'redPlayer:id,name', 'blackPlayer:id,name']);
        return response()->json(['data' => [
            'id' => $round->id, 'code' => $round->room?->code, 'round_number' => $round->round_number,
            'red_player' => $round->redPlayer, 'black_player' => $round->blackPlayer,
            'board' => $round->board, 'move_history' => $round->move_history,
            'starting_color' => $round->state['starting_color'] ?? 'red',
        ]]);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['waiting', 'playing', 'paused', 'finished', 'cancelled'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);
        $query = ChineseChessRound::query()->with(['room:id,code', 'redPlayer:id,name', 'blackPlayer:id,name', 'winner:id,name']);
        if ($search = trim($filters['search'] ?? '')) {
            $query->where(function ($query) use ($search) {
                $query->whereHas('room', fn ($room) => $room->where('code', 'like', "%{$search}%"))
                    ->orWhereHas('redPlayer', fn ($player) => $player->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('blackPlayer', fn ($player) => $player->where('name', 'like', "%{$search}%"));
            });
        }
        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }
        $page = $query->orderByDesc('updated_at')->orderByDesc('id')->paginate($filters['per_page'] ?? 15);
        return response()->json(['data' => [
            'items' => $page->getCollection()->map(fn ($room) => [
                'id' => $room->id, 'room_id' => $room->room_id, 'code' => $room->room?->code, 'round_number' => $room->round_number,
                'red_player' => $room->redPlayer, 'black_player' => $room->blackPlayer,
                'winner' => $room->winner, 'status' => $room->status, 'finish_reason' => $room->finish_reason,
                'move_count' => count($room->move_history ?? []),
                'finished_at' => $room->finished_at?->toISOString(), 'started_at' => $room->started_at?->toISOString(), 'updated_at' => $room->updated_at?->toISOString(),
            ]),
            'pagination' => [
                'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(), 'total' => $page->total(),
                'from' => $page->firstItem(), 'to' => $page->lastItem(),
            ],
        ]]);
    }
}
