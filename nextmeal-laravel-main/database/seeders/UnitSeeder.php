<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('units')->upsert([
            ['unit_code' => 'g',  'name' => 'gram'],
            ['unit_code' => 'kg', 'name' => 'kilogram'],
            ['unit_code' => 'ml', 'name' => 'milliliter'],
            ['unit_code' => 'l',  'name' => 'liter'],
            ['unit_code' => 'tsp','name' => 'teaspoon'],
            ['unit_code' => 'tbsp','name' => 'tablespoon'],
            ['unit_code' => 'pc', 'name' => 'piece'],
        ], ['unit_code'], ['name']);
    }
}
