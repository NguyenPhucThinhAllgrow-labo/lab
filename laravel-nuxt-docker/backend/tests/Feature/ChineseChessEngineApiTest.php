<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ChineseChessEngineApiTest extends TestCase
{
    public function test_it_maps_the_pikafish_move_back_to_a_client_candidate(): void
    {
        config()->set('services.chinese_chess_engine.url', 'http://pikafish:8080');
        Http::fake([
            'http://pikafish:8080/bestmove' => Http::response([
                'bestmove' => 'h2e2',
                'engine' => 'Pikafish 2026-01-02',
                'depth' => 18,
                'score_cp' => 32,
                'nodes' => 123456,
            ]),
        ]);

        $response = $this->postJson('/api/chinese-chess/engine/best-move', [
            'fen' => 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR b - - 0 1',
            'candidates' => [
                ['id' => 'black-cannon-right:7:4', 'uci' => 'h2e2'],
                ['id' => 'black-horse-right:2:6', 'uci' => 'h9g7'],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('candidate_id', 'black-cannon-right:7:4')
            ->assertJsonPath('bestmove', 'h2e2')
            ->assertJsonPath('engine.depth', 18);

        Http::assertSent(fn ($request): bool =>
            $request->url() === 'http://pikafish:8080/bestmove'
            && $request['search_moves'] === ['h2e2', 'h9g7']
        );
    }

    public function test_it_returns_service_unavailable_when_pikafish_is_offline(): void
    {
        config()->set('services.chinese_chess_engine.url', 'http://pikafish:8080');
        Http::fake([
            'http://pikafish:8080/bestmove' => Http::response(['message' => 'offline'], 503),
        ]);

        $this->postJson('/api/chinese-chess/engine/best-move', [
            'fen' => 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR b - - 0 1',
            'candidates' => [['id' => 'move-1', 'uci' => 'h2e2']],
        ])->assertStatus(503);
    }
}
