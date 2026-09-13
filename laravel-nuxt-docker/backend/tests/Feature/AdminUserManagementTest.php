<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_edit_and_delete_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $data = ['name' => 'New Player', 'email' => 'new@example.com', 'role' => 'user', 'password' => 'password123', 'password_confirmation' => 'password123'];
        $created = $this->actingAs($admin)->postJson('/api/admin/users', $data)->assertCreated()->assertJsonMissingPath('data.password');
        $id = $created->json('data.id');
        $user = User::findOrFail($id);
        $this->assertTrue(Hash::check('password123', $user->password));
        $user->forceFill(['email_verified_at' => now()])->save();
        $this->putJson('/api/admin/users/'.$id, ['name' => 'Edited', 'email' => 'edited@example.com', 'role' => 'admin', 'password' => ''])
            ->assertOk()->assertJsonPath('data.name', 'Edited')->assertJsonPath('data.email_verified_at', null);
        $this->assertTrue(Hash::check('password123', $user->fresh()->password));
        $token = $user->createToken('test')->plainTextToken;
        $this->putJson('/api/admin/users/'.$id, ['name' => 'Edited', 'email' => 'edited@example.com', 'role' => 'user', 'password' => 'changed123', 'password_confirmation' => 'changed123'])->assertOk();
        $this->assertTrue(Hash::check('changed123', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
        app(\App\Services\ChineseChessRoomService::class)->create($user->fresh());
        $this->deleteJson('/api/admin/users/'.$id)->assertOk();
        $this->assertSoftDeleted('users', ['id' => $id]);
        $this->getJson('/api/admin/users?search=edited@example.com')->assertJsonPath('data.pagination.total', 0);
        $this->putJson('/api/admin/users/'.$id, $data)->assertNotFound();
    }

    public function test_validation_and_admin_access_are_enforced(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);
        foreach (['post', 'put', 'delete'] as $method) {
            $url = '/api/admin/users'.($method === 'post' ? '' : '/'.$user->id);
            $this->{$method.'Json'}($url)->assertUnauthorized();
        }
        $this->actingAs($user)->postJson('/api/admin/users', [])->assertForbidden();
        $this->putJson('/api/admin/users/'.$admin->id, [])->assertForbidden();
        $this->deleteJson('/api/admin/users/'.$admin->id)->assertForbidden();
        $this->actingAs($admin)->postJson('/api/admin/users', ['name' => 'Test', 'email' => $user->email, 'role' => 'invalid', 'password' => 'short'])->assertUnprocessable()->assertJsonValidationErrors(['email', 'role', 'password']);
        $this->deleteJson('/api/admin/users/'.$admin->id)->assertUnprocessable();
        $this->putJson('/api/admin/users/'.$admin->id, ['name' => $admin->name, 'email' => $admin->email, 'role' => 'user'])->assertUnprocessable();
    }
}
