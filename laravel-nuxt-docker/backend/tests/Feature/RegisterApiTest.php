<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_register_a_player_account(): void
    {
        $response = $this->withHeader('Origin', 'http://localhost')->postJson('/api/register', [
            'name' => 'New Player',
            'email' => 'PLAYER@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.name', 'New Player')
            ->assertJsonPath('user.email', 'player@example.com')
            ->assertJsonPath('user.role', 'user');

        $this->assertAuthenticatedAs(User::query()->where('email', 'player@example.com')->first());
    }

    public function test_registration_requires_a_unique_email(): void
    {
        User::factory()->create(['email' => 'player@example.com']);

        $this->postJson('/api/register', [
            'name' => 'New Player',
            'email' => 'player@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_registration_requires_a_confirmed_password(): void
    {
        $this->postJson('/api/register', [
            'name' => 'New Player',
            'email' => 'player@example.com',
            'password' => 'password123',
            'password_confirmation' => 'different-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }
}
