<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Default database seeders (recipes, ingredients, system user, etc.).
 *
 * IMPORTANT – User data (inventory, favorites, shopping list) is NEVER deleted by these seeders.
 * They only INSERT or UPDATE recipes, ingredients, cuisines, etc.
 *
 * - To add/update recipe data WITHOUT losing users or inventory:
 *   php artisan db:seed
 *
 * - If you run "migrate:fresh --seed" or "migrate:refresh --seed", the MIGRATE step drops
 *   all tables first, so all users and user preferences (inventory, favorites, etc.) will
 *   be deleted. Use only when you intend to reset the entire database.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SystemUsersSeeder::class, // Must run first to create system user
            IngredientsFromCsvSeeder::class,
            IngredientExpireDefaultsSeeder::class, // Default days until expiry per ingredient (from CSV)
            RecipesFromCsvSeeder::class,
            RecipeCuisineMethodSeeder::class,
            RecipeStepsFromCsvSeeder::class,
        ]);
    }
}
