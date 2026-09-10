<?php

use App\Models\ChineseChessRoom;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chinese-chess.{roomId}', function (User $user, int $roomId): array|false {
    if (! ChineseChessRoom::query()->whereKey($roomId)->exists()) {
        return false;
    }

    return ['id' => $user->id, 'name' => $user->name];
});
