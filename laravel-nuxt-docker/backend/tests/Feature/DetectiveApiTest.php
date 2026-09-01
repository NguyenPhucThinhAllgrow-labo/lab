<?php

namespace Tests\Feature;

use App\Models\DetectiveCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DetectiveApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_active_cases_in_the_requested_locale(): void
    {
        $this->createCase();

        $this->getJson('/api/detective/cases?locale=vi')
            ->assertOk()
            ->assertJsonPath('data.0.id', 'case001')
            ->assertJsonPath('data.0.title', 'Vụ án thử nghiệm');
    }

    public function test_progress_requires_authentication(): void
    {
        $case = $this->createCase();

        $this->putJson("/api/detective/cases/{$case->id}/progress", [])
            ->assertUnauthorized();
    }

    public function test_a_user_can_save_and_read_detective_progress(): void
    {
        $case = $this->createCase();
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $payload = [
            'locale' => 'vi',
            'current_directory' => '/logs',
            'discovered_evidence' => ['system-activity'],
            'completed_tasks' => ['inspect-logs'],
            'command_history' => ['ls', 'cd logs', 'cat system.log'],
            'terminal_lines' => [
                ['id' => 1, 'type' => 'command', 'text' => 'cat system.log'],
            ],
            'game_completed' => false,
        ];

        $this->putJson("/api/detective/cases/{$case->id}/progress", $payload)
            ->assertOk()
            ->assertJsonPath('data.current_directory', '/logs')
            ->assertJsonPath('data.discovered_evidence.0', 'system-activity');

        $this->getJson("/api/detective/cases/{$case->id}/progress")
            ->assertOk()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.case_id', $case->id);
    }

    public function test_a_user_can_reset_progress(): void
    {
        $case = $this->createCase();
        Sanctum::actingAs(User::factory()->create());

        $this->putJson("/api/detective/cases/{$case->id}/progress", [
            'current_directory' => '/logs',
        ])->assertOk();

        $this->deleteJson("/api/detective/cases/{$case->id}/progress")
            ->assertOk();

        $this->assertDatabaseCount('detective_progress', 0);
    }

    private function createCase(): DetectiveCase
    {
        return DetectiveCase::query()->create([
            'id' => 'case001',
            'title' => ['en' => 'Test case', 'vi' => 'Vụ án thử nghiệm'],
            'description' => ['en' => 'Description', 'vi' => 'Mô tả'],
            'sort_order' => 1,
            'is_active' => true,
        ]);
    }
}
