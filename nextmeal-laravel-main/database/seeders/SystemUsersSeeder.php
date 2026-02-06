<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SystemUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create system user (cannot login, only owns system data)
        User::updateOrCreate(
            ['user_id' => User::SYSTEM_USER_ID],
            [
                'user_id' => User::SYSTEM_USER_ID,
                'name' => 'System',
                'email' => 'system@nextmeal.local',
                'password' => Hash::make(bin2hex(random_bytes(32))), // Random password, can't login
                'role' => User::ROLE_SYSTEM,
                'notifications_enabled' => false,
            ]
        );

        $this->command->info('System user created with ID: ' . User::SYSTEM_USER_ID);

        // Create admin user
        $adminUser = User::updateOrCreate(
            ['email' => 'admin@nextmeal.local'],
            [
                'name' => 'Admin',
                'email' => 'admin@nextmeal.local',
                'password' => Hash::make('admin123'), // Change in production!
                'role' => User::ROLE_ADMIN,
                'notifications_enabled' => true,
            ]
        );

        $this->command->info('Admin user created with ID: ' . $adminUser->user_id);
        $this->command->info('Admin login: admin@nextmeal.local / admin123');
    }
}
