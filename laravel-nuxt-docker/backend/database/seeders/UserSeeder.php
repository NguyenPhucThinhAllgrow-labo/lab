<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('password123');

        User::updateOrCreate(
            [
                'email' => 'admin@example.com',
            ],
            [
                'name' => 'Admin',
                'role' => 'admin',
                'password' => $password,
            ],
        );

        User::updateOrCreate(
            [
                'email' => 'player@example.com',
            ],
            [
                'name' => 'Detective Player',
                'role' => 'user',
                'password' => $password,
            ],
        );

        foreach (range(1, 10) as $number) {
            $suffix = str_pad((string) $number, 2, '0', STR_PAD_LEFT);

            User::updateOrCreate(
                [
                    'email' => "player{$suffix}@example.com",
                ],
                [
                    'name' => "Detective Player {$suffix}",
                    'role' => 'user',
                    'password' => $password,
                ],
            );
        }
    }
}
