<?php

namespace Tests\Feature;

use App\Events\ChineseChessRoomUpdated;
use App\Models\ChineseChessRoom;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ChineseChessRoomApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_users_can_create_join_and_play_a_legal_move(): void
    {
        Event::fake([ChineseChessRoomUpdated::class]);
        $red = User::factory()->create(['role' => 'user']);
        $black = User::factory()->create(['role' => 'user']);

        $created = $this->actingAs($red)->postJson('/api/chinese-chess/rooms')->assertCreated();
        $code = $created->json('room.code');

        $joined = $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/join")
            ->assertOk()
            ->assertJsonPath('room.status', 'waiting')
            ->assertJsonPath('room.red_ready', false)
            ->assertJsonPath('room.black_ready', false)
            ->assertJsonPath('room.your_color', 'black');

        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/ready")
            ->assertOk()
            ->assertJsonPath('room.status', 'waiting')
            ->assertJsonPath('room.red_ready', true)
            ->assertJsonPath('room.black_ready', false);

        $started = $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/ready")
            ->assertOk()
            ->assertJsonPath('room.status', 'playing')
            ->assertJsonPath('room.red_ready', true)
            ->assertJsonPath('room.black_ready', true);

        $version = $started->json('room.version');
        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/moves", [
            'piece_id' => 'red-soldier-1',
            'to' => ['row' => 5, 'col' => 0],
            'version' => $version,
        ])->assertOk()
            ->assertJsonPath('room.current_turn', 'black')
            ->assertJsonPath('room.move_history.0.piece.id', 'red-soldier-1')
            ->assertJsonPath('room.move_history.0.is_check', false);

        Event::assertDispatched(ChineseChessRoomUpdated::class, function (ChineseChessRoomUpdated $event): bool {
            $payload = $event->broadcastWith();

            return array_keys($payload) === ['room_id', 'version', 'action']
                && strlen((string) json_encode($payload)) < 1024;
        });
    }

    public function test_room_rejects_a_third_player_and_out_of_turn_move(): void
    {
        Event::fake([ChineseChessRoomUpdated::class]);
        [$red, $black, $third] = User::factory()->count(3)->create(['role' => 'user']);
        $code = $this->actingAs($red)->postJson('/api/chinese-chess/rooms')->json('room.code');
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/join");
        $version = $this->startGame($code, $red, $black);

        $this->actingAs($third)->postJson("/api/chinese-chess/rooms/{$code}/join")->assertUnprocessable();
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/moves", [
            'piece_id' => 'black-soldier-1',
            'to' => ['row' => 4, 'col' => 0],
            'version' => $version,
        ])->assertUnprocessable()->assertJsonValidationErrors('turn');
    }

    public function test_surrender_finishes_the_game_for_the_opponent(): void
    {
        Event::fake([ChineseChessRoomUpdated::class]);
        $red = User::factory()->create(['role' => 'user']);
        $black = User::factory()->create(['role' => 'user']);
        $code = $this->actingAs($red)->postJson('/api/chinese-chess/rooms')->json('room.code');
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/join");
        $this->startGame($code, $red, $black);

        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/surrender")
            ->assertOk()
            ->assertJsonPath('room.status', 'finished')
            ->assertJsonPath('room.finish_reason', 'surrender')
            ->assertJsonPath('room.winner.id', $black->id);

        $this->assertSame($black->id, ChineseChessRoom::where('code', $code)->value('winner_id'));
    }

    public function test_server_rejects_an_illegal_move(): void
    {
        Event::fake([ChineseChessRoomUpdated::class]);
        $red = User::factory()->create(['role' => 'user']);
        $black = User::factory()->create(['role' => 'user']);
        $code = $this->actingAs($red)->postJson('/api/chinese-chess/rooms')->json('room.code');
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/join");
        $version = $this->startGame($code, $red, $black);

        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/moves", [
            'piece_id' => 'red-chariot-1',
            'to' => ['row' => 5, 'col' => 0],
            'version' => $version,
        ])->assertUnprocessable()->assertJsonValidationErrors('move');
    }

    public function test_check_is_recorded_in_move_history(): void
    {
        Event::fake([ChineseChessRoomUpdated::class]);
        $red = User::factory()->create(['role' => 'user']);
        $black = User::factory()->create(['role' => 'user']);
        $code = $this->actingAs($red)->postJson('/api/chinese-chess/rooms')->json('room.code');
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/join");
        $version = $this->startGame($code, $red, $black);

        $room = ChineseChessRoom::where('code', $code)->firstOrFail();
        $room->board = [
            ['id' => 'black-general', 'type' => 'general', 'color' => 'black', 'row' => 0, 'col' => 4],
            ['id' => 'red-chariot-1', 'type' => 'chariot', 'color' => 'red', 'row' => 1, 'col' => 3],
            ['id' => 'red-soldier-1', 'type' => 'soldier', 'color' => 'red', 'row' => 5, 'col' => 4],
            ['id' => 'red-general', 'type' => 'general', 'color' => 'red', 'row' => 9, 'col' => 4],
        ];
        $room->save();

        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/moves", [
            'piece_id' => 'red-chariot-1',
            'to' => ['row' => 1, 'col' => 4],
            'version' => $version,
        ])->assertOk()
            ->assertJsonPath('room.move_history.0.is_check', true);
    }

    public function test_timeout_is_authoritative_and_persisted_before_a_move(): void
    {
        Event::fake([ChineseChessRoomUpdated::class]);
        $red = User::factory()->create(['role' => 'user']);
        $black = User::factory()->create(['role' => 'user']);
        $code = $this->actingAs($red)->postJson('/api/chinese-chess/rooms')->json('room.code');
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/join");
        $version = $this->startGame($code, $red, $black);

        ChineseChessRoom::where('code', $code)->update([
            'red_time_seconds' => 1,
            'last_move_at' => now()->subSeconds(2),
        ]);

        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/moves", [
            'piece_id' => 'red-soldier-1',
            'to' => ['row' => 5, 'col' => 0],
            'version' => $version,
        ])->assertOk()
            ->assertJsonPath('room.status', 'finished')
            ->assertJsonPath('room.finish_reason', 'timeout')
            ->assertJsonPath('room.winner.id', $black->id);
    }

    public function test_either_player_can_pause_and_resume_without_losing_clock_time(): void
    {
        Event::fake([ChineseChessRoomUpdated::class]);
        $red = User::factory()->create(['role' => 'user']);
        $black = User::factory()->create(['role' => 'user']);
        $code = $this->actingAs($red)->postJson('/api/chinese-chess/rooms')->json('room.code');
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/join");
        $this->startGame($code, $red, $black);

        ChineseChessRoom::where('code', $code)->update([
            'red_time_seconds' => 100,
            'last_move_at' => now()->subSeconds(5),
        ]);

        $paused = $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/pause")
            ->assertOk()
            ->assertJsonPath('room.status', 'paused')
            ->assertJsonPath('room.red_time_seconds', 95)
            ->assertJsonPath('room.paused_by.id', $red->id)
            ->assertJsonPath('room.last_move_at', null);

        $this->actingAs($black)->getJson("/api/chinese-chess/rooms/{$code}")
            ->assertOk()
            ->assertJsonPath('room.status', 'paused')
            ->assertJsonPath('room.red_time_seconds', $paused->json('room.red_time_seconds'));

        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/resume")
            ->assertOk()
            ->assertJsonPath('room.status', 'playing')
            ->assertJsonPath('room.paused_by', null);

        $this->assertNotNull(ChineseChessRoom::where('code', $code)->value('last_move_at'));
    }

    public function test_first_round_starts_with_red_and_loser_starts_each_next_round(): void
    {
        Event::fake([ChineseChessRoomUpdated::class]);
        $red = User::factory()->create(['role' => 'user']);
        $black = User::factory()->create(['role' => 'user']);
        $code = $this->actingAs($red)->postJson('/api/chinese-chess/rooms')->json('room.code');
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/join");
        $this->startGame($code, $red, $black);

        $this->actingAs($red)->getJson("/api/chinese-chess/rooms/{$code}")
            ->assertOk()
            ->assertJsonPath('room.round_number', 1)
            ->assertJsonPath('room.starting_color', 'red')
            ->assertJsonPath('room.current_turn', 'red');

        // Black loses round one, therefore Black starts round two.
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/surrender")->assertOk();
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/rematch")->assertOk();
        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/rematch")
            ->assertOk()
            ->assertJsonPath('room.round_number', 2)
            ->assertJsonPath('room.starting_color', 'black')
            ->assertJsonPath('room.current_turn', 'black');

        // Red loses round two, therefore Red starts round three.
        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/surrender")->assertOk();
        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/rematch")->assertOk();
        $this->actingAs($black)->postJson("/api/chinese-chess/rooms/{$code}/rematch")
            ->assertOk()
            ->assertJsonPath('room.round_number', 3)
            ->assertJsonPath('room.starting_color', 'red')
            ->assertJsonPath('room.current_turn', 'red');
    }

    private function startGame(string $code, User $red, User $black): int
    {
        $this->actingAs($red)->postJson("/api/chinese-chess/rooms/{$code}/ready")->assertOk();

        return (int) $this->actingAs($black)
            ->postJson("/api/chinese-chess/rooms/{$code}/ready")
            ->assertOk()
            ->assertJsonPath('room.status', 'playing')
            ->json('room.version');
    }
}
