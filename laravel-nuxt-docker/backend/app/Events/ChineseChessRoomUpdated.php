<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChineseChessRoomUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $roomId,
        public readonly array $room,
        public readonly string $action,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("chinese-chess.{$this->roomId}")];
    }

    public function broadcastAs(): string
    {
        return 'chinese-chess.room.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'room' => $this->room,
            'action' => $this->action,
        ];
    }
}
