<?php

use App\Models\ChineseChessRoom;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chinese-chess.{roomId}', function (User $user, int $roomId): bool {
    return ChineseChessRoom::query()
        ->whereKey($roomId)
        ->where(fn ($query) => $query->where('red_player_id', $user->id)->orWhere('black_player_id', $user->id))
        ->exists();
});
