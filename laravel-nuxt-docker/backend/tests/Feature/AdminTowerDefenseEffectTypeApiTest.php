<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminTowerDefenseEffectTypeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_an_effect_type_understood_by_the_frontend(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $payload = [
            'id' => 'poison',
            'name' => 'Độc tố',
            'role' => 'damage',
            'behavior' => 'damage_over_time',
            'description' => 'Rút máu mục tiêu theo thời gian.',
            'color' => '#22c55e',
            'sort_order' => 10,
            'is_active' => true,
        ];

        $this->postJson('/api/admin/tower-defense/effect-types', $payload)
            ->assertCreated()
            ->assertJsonPath('data.id', 'poison')
            ->assertJsonPath('data.behavior', 'damage_over_time');

        $this->getJson('/api/tower-defense/effect-types')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Độc tố');

        $this->putJson('/api/admin/tower-defense/effect-types/poison', [...$payload, 'name' => 'Kịch độc'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Kịch độc');
    }
}
