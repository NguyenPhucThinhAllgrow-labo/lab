<?php

namespace Tests\Feature;

use App\Models\DetectiveCase;
use App\Models\DetectiveCompletionHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDetectiveLeaderboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_ranked_pandora_completions_from_database(): void
    {
        $case = $this->createCase('case004', 'Mật mã Orpheus');
        $fastPlayer = User::factory()->create(['name' => 'Fast Detective']);
        $highScorePlayer = User::factory()->create(['name' => 'Sharp Detective']);

        $this->createHistory($case, $fastPlayer, 90, 240, 2);
        $this->createHistory($case, $highScorePlayer, 96, 420, 1);
        $this->createHistory($case, $highScorePlayer, 88, 180, 4);

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/admin/pandora/leaderboard/best?case_id=case004')
            ->assertOk()
            ->assertJsonPath('data.summary.players', 2)
            ->assertJsonPath('data.summary.completions', 3)
            ->assertJsonPath('data.cases.0.title', 'Mật mã Orpheus')
            ->assertJsonPath('data.items.0.player.name', 'Sharp Detective')
            ->assertJsonPath('data.items.0.score', 96)
            ->assertJsonPath('data.items.0.attempts', 2)
            ->assertJsonPath('data.items.1.player.name', 'Fast Detective')
            ->assertJsonPath('data.pagination.total', 2);

        $this->getJson('/api/admin/pandora/leaderboard/history?case_id=case004')
            ->assertOk()
            ->assertJsonCount(3, 'data.items')
            ->assertJsonPath('data.items.0.attempt_number', 2)
            ->assertJsonPath('data.pagination.total', 3);
    }

    public function test_player_cannot_view_admin_pandora_leaderboard(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->getJson('/api/admin/pandora/leaderboard/best')->assertForbidden();
    }

    public function test_leaderboard_requires_authentication(): void
    {
        $this->getJson('/api/admin/pandora/leaderboard/best')->assertUnauthorized();
    }

    public function test_case_ranking_filter_does_not_remove_other_cases_from_full_history(): void
    {
        $firstCase = $this->createCase('case003', 'Dấu vết lúc nửa đêm');
        $secondCase = $this->createCase('case004', 'Mật mã Orpheus');
        $player = User::factory()->create();

        $this->createHistory($firstCase, $player, 82, 360, 1);
        $this->createHistory($secondCase, $player, 94, 280, 0);

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/admin/pandora/leaderboard/best?case_id=case004')
            ->assertOk()
            ->assertJsonCount(1, 'data.items');

        $this->getJson('/api/admin/pandora/leaderboard/history')
            ->assertOk()
            ->assertJsonCount(2, 'data.items');
    }

    public function test_each_case_has_an_independent_ranking(): void
    {
        $firstCase = $this->createCase('case003', 'Dấu vết lúc nửa đêm');
        $secondCase = $this->createCase('case004', 'Mật mã Orpheus');
        $firstPlayer = User::factory()->create();
        $secondPlayer = User::factory()->create();

        $this->createHistory($firstCase, $firstPlayer, 95, 400, 0);
        $this->createHistory($firstCase, $secondPlayer, 80, 300, 1);
        $this->createHistory($secondCase, $firstPlayer, 75, 240, 2);
        $this->createHistory($secondCase, $secondPlayer, 92, 360, 0);

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $response = $this->getJson('/api/admin/pandora/leaderboard/best')->assertOk();
        $ranksByCase = collect($response->json('data.items'))
            ->groupBy('case.id')
            ->map(fn ($entries) => collect($entries)->pluck('rank')->all())
            ->all();

        $this->assertSame([1, 2], $ranksByCase['case003']);
        $this->assertSame([1, 2], $ranksByCase['case004']);
    }

    public function test_best_and_history_endpoints_are_paginated_by_the_backend(): void
    {
        $case = $this->createCase('case004', 'Mật mã Orpheus');

        foreach (range(1, 3) as $index) {
            $this->createHistory($case, User::factory()->create(), 90 - $index, 200 + $index, 0);
        }

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/admin/pandora/leaderboard/best?per_page=2&page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.pagination.current_page', 2)
            ->assertJsonPath('data.pagination.total', 3);

        $this->getJson('/api/admin/pandora/leaderboard/history?per_page=2&page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.pagination.current_page', 2)
            ->assertJsonPath('data.pagination.total', 3);
    }

    private function createCase(string $id, string $title): DetectiveCase
    {
        return DetectiveCase::query()->create([
            'id' => $id,
            'title' => ['vi' => $title, 'en' => $title],
            'description' => ['vi' => 'Mô tả', 'en' => 'Description'],
            'scenario' => [],
            'sort_order' => 1,
            'is_active' => true,
        ]);
    }

    private function createHistory(
        DetectiveCase $case,
        User $user,
        int $score,
        int $elapsedSeconds,
        int $hintCount,
    ): DetectiveCompletionHistory {
        return DetectiveCompletionHistory::query()->create([
            'run_id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'case_id' => $case->id,
            'elapsed_seconds' => $elapsedSeconds,
            'evidence_history' => [],
            'task_history' => [],
            'linked_evidence' => [],
            'command_history' => [],
            'statistics' => [
                'score' => $score,
                'rank' => $score >= 90 ? 'S' : 'A',
                'hint_count' => $hintCount,
                'incorrect_link_attempts' => 0,
                'command_count' => 12,
            ],
            'started_at' => now()->subSeconds($elapsedSeconds),
            'completed_at' => now(),
        ]);
    }
}
