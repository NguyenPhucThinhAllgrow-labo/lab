<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_search_and_filter_paginated_users(): void
    {
        User::factory()->create([
            'name' => 'Detective Alpha',
            'email' => 'alpha@example.com',
            'role' => 'user',
        ]);
        User::factory()->create([
            'name' => 'System Operator',
            'email' => 'operator@example.com',
            'role' => 'admin',
        ]);

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/admin/users?search=Alpha&role=user&per_page=5')
            ->assertOk()
            ->assertJsonCount(1, 'data.users')
            ->assertJsonPath('data.users.0.name', 'Detective Alpha')
            ->assertJsonPath('data.users.0.role', 'user')
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.pagination.current_page', 1);
    }

    public function test_normal_user_cannot_view_admin_user_list(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->getJson('/api/admin/users')->assertForbidden();
    }

    public function test_user_list_requires_authentication(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }
}
