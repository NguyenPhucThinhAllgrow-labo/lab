<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chinese_chess_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('chinese_chess_rooms')->restrictOnDelete();
            $table->unsignedInteger('round_number');
            $table->foreignId('red_player_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('black_player_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('winner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->index();
            $table->string('finish_reason')->nullable();
            $table->json('board');
            $table->json('move_history');
            $table->json('state');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->unique(['room_id', 'round_number']);
        });

        // Only the latest surviving round can be recovered from each old room.
        DB::table('chinese_chess_rooms')->orderBy('id')->chunkById(100, function ($rooms) {
            foreach ($rooms as $room) {
                DB::table('chinese_chess_rounds')->insert([
                    'room_id' => $room->id, 'round_number' => $room->round_number,
                    'red_player_id' => $room->red_player_id, 'black_player_id' => $room->black_player_id,
                    'winner_id' => $room->winner_id, 'status' => $room->status, 'finish_reason' => $room->finish_reason,
                    'board' => $room->board, 'move_history' => $room->move_history ?? '[]',
                    'state' => json_encode((array) $room, JSON_THROW_ON_ERROR),
                    'started_at' => $room->started_at,
                    'finished_at' => in_array($room->status, ['finished', 'cancelled']) ? $room->updated_at : null,
                    'created_at' => $room->started_at ?? $room->created_at, 'updated_at' => $room->updated_at,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chinese_chess_rounds');
    }
};
