<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ChineseChessRoomService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminChineseChessHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_history_is_admin_only_and_supports_filters_and_pagination(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $player = User::factory()->create(['role' => 'user', 'name' => 'Chess Tester']);
        $other = User::factory()->create(['role' => 'user']);
        $room = app(ChineseChessRoomService::class)->create($player);
        app(ChineseChessRoomService::class)->create($other);
        $this->getJson('/api/admin/chinese-chess/history')->assertUnauthorized();
        $this->actingAs($player)->getJson('/api/admin/chinese-chess/history')->assertForbidden();
        $this->actingAs($admin)->getJson('/api/admin/chinese-chess/history?per_page=1')
            ->assertOk()->assertJsonCount(1, 'data.items')->assertJsonPath('data.pagination.total', 2);
        $this->getJson('/api/admin/chinese-chess/history?search=Chess%20Tester&status=waiting')
            ->assertOk()->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.code', $room->code)
            ->assertJsonPath('data.items.0.red_player.name', 'Chess Tester');
        $this->getJson('/api/admin/chinese-chess/history?status=finished')
            ->assertOk()->assertJsonCount(0, 'data.items');
        $this->getJson('/api/admin/chinese-chess/history?per_page=101')->assertUnprocessable();
    }
    public function test_rematch_preserves_previous_round_and_admin_lists_both_rounds(): void
    {
        $red = User::factory()->create(['role' => 'user']);
        $black = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $service = app(ChineseChessRoomService::class);
        $room = $service->create($red);
        $service->join($room->code, $black);
        $service->ready($room->code, $red);
        $room = $service->ready($room->code, $black);
        $service->move($room->code, $red, [
            'version' => $room->version, 'piece_id' => 'red-soldier-1', 'to' => ['row' => 5, 'col' => 0],
        ]);
        $room = $service->surrender($room->code, $black);
        $first = $room->rounds()->first();
        $this->assertCount(1, $first->move_history);
        $this->assertSame('finished', $first->status);
        $this->assertEquals($red->id, $first->winner_id);
        $snapshot = $first->getAttributes();
        $this->actingAs($black)->getJson('/api/admin/chinese-chess/history/'.$first->id)->assertForbidden();
        $this->actingAs($admin)->getJson('/api/admin/chinese-chess/history/'.$first->id)
            ->assertOk()->assertJsonPath('data.round_number', 1)
            ->assertJsonCount(1, 'data.move_history')->assertJsonPath('data.move_history.0.to.row', 5);

        $service->rematch($room->code, $red);
        $room = $service->rematch($room->code, $black);
        $this->assertSame($snapshot, $first->fresh()->getAttributes());
        $this->actingAs($admin)->getJson('/api/admin/chinese-chess/history/'.$first->id)
            ->assertOk()->assertJsonPath('data.round_number', 1)->assertJsonCount(1, 'data.move_history');

        $this->assertSame(2, $room->rounds()->count());
        $second = $room->rounds()->where('round_number', 2)->firstOrFail();
        $this->assertSame([], $second->move_history);
        $this->assertSame('playing', $second->status);
        $this->assertNull($second->winner_id);
        $this->assertNotNull($first->finished_at);
        $this->assertNull($second->finished_at);
        $service->leave($room->code, $red);
        $this->assertSame('player_left', $second->fresh()->finish_reason);
        $this->assertSame($snapshot, $first->fresh()->getAttributes());
        $this->actingAs($admin)->getJson('/api/admin/chinese-chess/history?search='.$room->code)
            ->assertOk()->assertJsonPath('data.pagination.total', 2)->assertJsonCount(2, 'data.items');
    }

    public function test_round_records_roll_back_with_room_changes(): void
    {
        $player = User::factory()->create(['role' => 'user']);
        \Illuminate\Support\Facades\DB::beginTransaction();
        $room = app(ChineseChessRoomService::class)->create($player);
        $this->assertSame(1, $room->rounds()->count());
        \Illuminate\Support\Facades\DB::rollBack();
        $this->assertDatabaseMissing('chinese_chess_rooms', ['id' => $room->id]);
        $this->assertDatabaseCount('chinese_chess_rounds', 0);
    }
}
