<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChineseChessRoomUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $roomId,
        public readonly int $version,
        public readonly string $action,
        public readonly ?array $state = null,
    ) {}

    public function broadcastOn(): array
    {
        return [new PresenceChannel("chinese-chess.{$this->roomId}")];
    }

    public function broadcastAs(): string
    {
        return 'chinese-chess.room.updated';
    }

    public function broadcastWith(): array
    {
        return array_filter([
            'room_id' => $this->roomId,
            'version' => $this->version,
            'action' => $this->action,
            'state' => $this->state,
        ], static fn (mixed $value): bool => $value !== null);
    }
}
