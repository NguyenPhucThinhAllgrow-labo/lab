<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_login_only_accepts_user_accounts(): void
    {
        User::factory()->create([
            'email' => 'player@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);

        $this->withHeader('Origin', 'http://localhost')->postJson('/api/login', [
            'email' => 'player@example.com',
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('user.role', 'user');
    }

    public function test_admin_login_rejects_a_player_account(): void
    {
        User::factory()->create([
            'email' => 'player@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);

        $this->withHeader('Origin', 'http://localhost')->postJson('/api/admin/login', [
            'email' => 'player@example.com',
            'password' => 'password123',
        ])->assertUnprocessable();
    }

    public function test_admin_login_accepts_an_admin_account(): void
    {
        User::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        $this->withHeader('Origin', 'http://localhost')->postJson('/api/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('user.role', 'admin');
    }

    public function test_player_cannot_access_admin_api(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->getJson('/api/admin/user')->assertForbidden();
    }
}
