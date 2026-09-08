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
        Sanctum::actingAs(User::factory()->create());

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

    public function test_case_list_requires_player_authentication(): void
    {
        $this->getJson('/api/detective/cases')
            ->assertUnauthorized();
    }

    public function test_it_returns_the_complete_scenario_for_a_case(): void
    {
        $case = $this->createCase();
        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/detective/cases/{$case->id}")
            ->assertOk()
            ->assertJsonPath('data.scenario.id', 'case001')
            ->assertJsonPath('data.scenario.filesystem.0.name', 'logs')
            ->assertJsonCount(1, 'data.scenario.tasks');
    }

    public function test_an_admin_cannot_access_player_detective_api(): void
    {
        $this->createCase();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/detective/cases')
            ->assertForbidden();
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
            'unlocked_paths' => ['/analysis/arrest-dossier.txt'],
            'command_history' => ['ls', 'cd logs', 'cat system.log'],
            'terminal_lines' => [
                ['id' => 1, 'type' => 'command', 'text' => 'cat system.log'],
                [
                    'id' => 2,
                    'type' => 'output',
                    'text' => '     ├── system.log — Event log',
                    'highlights' => [['start' => 9, 'end' => 19]],
                ],
            ],
            'game_completed' => false,
        ];

        $this->putJson("/api/detective/cases/{$case->id}/progress", $payload)
            ->assertOk()
            ->assertJsonPath('data.current_directory', '/logs')
            ->assertJsonPath('data.discovered_evidence.0', 'system-activity')
            ->assertJsonPath('data.unlocked_paths.0', '/analysis/arrest-dossier.txt')
            ->assertJsonPath('data.terminal_lines.1.text', '     ├── system.log — Event log')
            ->assertJsonPath('data.terminal_lines.1.highlights.0.start', 9);

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

    public function test_evidence_can_be_reused_across_different_tasks(): void
    {
        $case = $this->createCase();
        Sanctum::actingAs(User::factory()->create());

        $this->putJson("/api/detective/cases/{$case->id}/progress", [
            'linked_evidence' => [
                'first-task' => ['shared-evidence', 'first-evidence'],
                'second-task' => ['shared-evidence', 'second-evidence'],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.linked_evidence.first-task.0', 'shared-evidence')
            ->assertJsonPath('data.linked_evidence.second-task.0', 'shared-evidence');
    }

    public function test_the_same_evidence_cannot_be_linked_twice_to_one_task(): void
    {
        $case = $this->createCase();
        Sanctum::actingAs(User::factory()->create());

        $this->putJson("/api/detective/cases/{$case->id}/progress", [
            'linked_evidence' => [
                'first-task' => ['shared-evidence', 'shared-evidence'],
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('linked_evidence.first-task');
    }

    public function test_completing_a_case_creates_detailed_history(): void
    {
        $case = $this->createCase();
        Sanctum::actingAs(User::factory()->create());

        $this->putJson("/api/detective/cases/{$case->id}/progress", [
            'game_completed' => true,
            'elapsed_seconds' => 125,
            'discovered_evidence' => ['system-activity'],
            'completed_tasks' => ['inspect-logs'],
            'evidence_history' => [[
                'id' => 'system-activity',
                'elapsed_seconds' => 42,
                'recorded_at' => now()->toISOString(),
            ]],
            'task_history' => [[
                'id' => 'inspect-logs',
                'elapsed_seconds' => 125,
                'recorded_at' => now()->toISOString(),
            ]],
        ])->assertOk();

        $this->getJson('/api/detective/history')
            ->assertOk()
            ->assertJsonPath('data.0.elapsed_seconds', 125)
            ->assertJsonPath('data.0.evidence_history.0.id', 'system-activity')
            ->assertJsonPath('data.0.task_history.0.id', 'inspect-logs')
            ->assertJsonPath('data.0.statistics.command_count', 0);
    }

    private function createCase(): DetectiveCase
    {
        return DetectiveCase::query()->create([
            'id' => 'case001',
            'title' => ['en' => 'Test case', 'vi' => 'Vụ án thử nghiệm'],
            'description' => ['en' => 'Description', 'vi' => 'Mô tả'],
            'scenario' => [
                'id' => 'case001',
                'title' => ['en' => 'Test case', 'vi' => 'Vụ án thử nghiệm'],
                'description' => ['en' => 'Description', 'vi' => 'Mô tả'],
                'initialDirectory' => '/',
                'intro' => ['en' => [], 'vi' => []],
                'filesystem' => [
                    ['type' => 'directory', 'name' => 'logs', 'children' => []],
                ],
                'evidence' => [],
                'tasks' => [
                    [
                        'id' => 'inspect-logs',
                        'title' => ['en' => 'Inspect logs', 'vi' => 'Kiểm tra log'],
                        'description' => ['en' => 'Inspect', 'vi' => 'Kiểm tra'],
                        'requiresEvidence' => [],
                    ],
                ],
            ],
            'sort_order' => 1,
            'is_active' => true,
        ]);
    }
}
