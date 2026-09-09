<?php

namespace App\Http\Controllers\Api;

use App\Events\ChineseChessRoomUpdated;
use App\Http\Controllers\Controller;
use App\Models\ChineseChessRoom;
use App\Services\ChineseChessRoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChineseChessRoomController extends Controller
{
    public function __construct(private readonly ChineseChessRoomService $rooms) {}

    public function create(Request $request): JsonResponse
    {
        return $this->respond($this->rooms->create($request->user()), $request, 'created', 201);
    }

    public function join(string $code, Request $request): JsonResponse
    {
        return $this->respond($this->rooms->join($code, $request->user()), $request, 'joined');
    }

    public function show(string $code, Request $request): JsonResponse
    {
        return response()->json(['room' => $this->rooms->state($this->rooms->show($code, $request->user()), $request->user())]);
    }

    public function move(string $code, Request $request): JsonResponse
    {
        $payload = $request->validate([
            'piece_id' => ['required', 'string', 'max:50'],
            'to' => ['required', 'array'],
            'to.row' => ['required', 'integer', 'between:0,9'],
            'to.col' => ['required', 'integer', 'between:0,8'],
            'version' => ['required', 'integer', 'min:0'],
        ]);

        return $this->respond($this->rooms->move($code, $request->user(), $payload), $request, 'moved');
    }

    public function ready(string $code, Request $request): JsonResponse
    {
        return $this->respond($this->rooms->ready($code, $request->user()), $request, 'ready');
    }

    public function surrender(string $code, Request $request): JsonResponse
    {
        return $this->respond($this->rooms->surrender($code, $request->user()), $request, 'surrendered');
    }

    public function pause(string $code, Request $request): JsonResponse
    {
        return $this->respond($this->rooms->pause($code, $request->user()), $request, 'paused');
    }

    public function resume(string $code, Request $request): JsonResponse
    {
        return $this->respond($this->rooms->resume($code, $request->user()), $request, 'resumed');
    }

    public function leave(string $code, Request $request): JsonResponse
    {
        return $this->respond($this->rooms->leave($code, $request->user()), $request, 'left');
    }

    public function rematch(string $code, Request $request): JsonResponse
    {
        return $this->respond($this->rooms->rematch($code, $request->user()), $request, 'rematch');
    }

    private function respond(ChineseChessRoom $room, Request $request, string $action, int $status = 200): JsonResponse
    {
        $state = $this->rooms->state($room, $request->user());
        broadcast(new ChineseChessRoomUpdated($room->id, $room->version, $action))->toOthers();

        return response()->json(['room' => $state], $status);
    }
}
