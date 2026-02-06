<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class RecipesAndRecipeIngredientsSeeder extends Seeder
{
    public function run(): void
    {
        $path = base_path('database/seeders/data/recipe_ingredients.csv');
        if (!file_exists($path)) {
            throw new \RuntimeException("Missing file: {$path}");
        }

        if (!Schema::hasTable('recipes') || !Schema::hasTable('recipe_ingredients')) {
            throw new \RuntimeException("Missing tables: recipes / recipe_ingredients");
        }

        $handle = fopen($path, 'r');
        if (!$handle) {
            throw new \RuntimeException("Cannot open: {$path}");
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            throw new \RuntimeException("CSV header missing");
        }

        $idx = array_flip($header);
        foreach (['recipe_name','ingredient','quantity','unit'] as $need) {
            if (!isset($idx[$need])) {
                fclose($handle);
                throw new \RuntimeException("CSV missing column: {$need}");
            }
        }

        // Map existing
        $ingredientMap = Schema::hasTable('ingredients')
            ? DB::table('ingredients')->pluck('ingredient_id', 'name')->toArray()
            : [];

        $unitExists = Schema::hasTable('units');

        // Column detection (recipes)
        $recipesHasName = Schema::hasColumn('recipes', 'name');
        $recipesHasRecipeId = Schema::hasColumn('recipes', 'recipe_id');

        if (!$recipesHasName || !$recipesHasRecipeId) {
            fclose($handle);
            throw new \RuntimeException("recipes table must have recipe_id + name");
        }

        // Column detection (recipe_ingredients)
        $riHasRecipeId = Schema::hasColumn('recipe_ingredients', 'recipe_id');
        $riHasIngredientId = Schema::hasColumn('recipe_ingredients', 'ingredient_id');
        if (!$riHasRecipeId || !$riHasIngredientId) {
            fclose($handle);
            throw new \RuntimeException("recipe_ingredients must have recipe_id + ingredient_id");
        }

        $riHasQuantity = Schema::hasColumn('recipe_ingredients', 'quantity');
        $riHasUnitCode = Schema::hasColumn('recipe_ingredients', 'unit_code');
        $riHasUnit = Schema::hasColumn('recipe_ingredients', 'unit'); // بعضی‌ها unit می‌ذارن
        $riHasAmount = Schema::hasColumn('recipe_ingredients', 'amount');

        // Build recipe map (by name)
        $recipeIdByName = DB::table('recipes')->pluck('recipe_id', 'name')->toArray();

        while (($row = fgetcsv($handle)) !== false) {
            $recipeName = trim((string)$row[$idx['recipe_name']]);
            $ingredientName = trim((string)$row[$idx['ingredient']]);
            $quantity = $row[$idx['quantity']] !== '' ? (float)$row[$idx['quantity']] : null;
            $unit = strtolower(trim((string)$row[$idx['unit']]));

            if ($recipeName === '' || $ingredientName === '') continue;

            // 1) Ensure recipe exists
            $recipeId = $recipeIdByName[$recipeName] ?? null;
            if (!$recipeId) {
                $recipeId = (string) Str::uuid();
                DB::table('recipes')->insert([
                    'recipe_id' => $recipeId,
                    'name' => $recipeName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $recipeIdByName[$recipeName] = $recipeId;
            }

            // 2) Ensure ingredient exists (اگر تو xlsx نبود)
            $ingredientId = $ingredientMap[$ingredientName] ?? null;
            if (!$ingredientId && Schema::hasTable('ingredients')) {
                $ingredientId = (string) Str::uuid();

                // فقط ستون‌هایی که قطعاً وجود دارن رو می‌زنیم
                $payload = [
                    'ingredient_id' => $ingredientId,
                    'name' => $ingredientName,
                ];
                if (Schema::hasColumn('ingredients', 'created_at')) $payload['created_at'] = now();
                if (Schema::hasColumn('ingredients', 'updated_at')) $payload['updated_at'] = now();

                DB::table('ingredients')->insert($payload);
                $ingredientMap[$ingredientName] = $ingredientId;
            }

            // 3) Ensure unit exists
            if ($unitExists && $unit !== '') {
                DB::table('units')->updateOrInsert(
                    ['unit_code' => $this->normalizeUnit($unit)],
                    ['name' => $this->unitName($this->normalizeUnit($unit))]
                );
            }

            // 4) Insert recipe ingredient row
            $payload = [
                'recipe_id' => $recipeId,
                'ingredient_id' => $ingredientId,
            ];

            $u = $unit ? $this->normalizeUnit($unit) : null;

            if ($riHasQuantity && $quantity !== null) $payload['quantity'] = $quantity;

            if ($riHasUnitCode && $u) $payload['unit_code'] = $u;
            elseif ($riHasUnit && $u) $payload['unit'] = $u;

            if ($riHasAmount) {
                // amount معمولاً stringه مثل "250 g"
                if ($quantity !== null && $u) $payload['amount'] = rtrim(rtrim((string)$quantity,'0'),'.') . ' ' . $u;
            }

            // اگر جدول recipe_ingredients ستونی برای uuid خودش دارد
            if (Schema::hasColumn('recipe_ingredients', 'recipe_ingredient_id')) {
                $payload['recipe_ingredient_id'] = (string) Str::uuid();
            }

            if (Schema::hasColumn('recipe_ingredients', 'created_at')) $payload['created_at'] = now();
            if (Schema::hasColumn('recipe_ingredients', 'updated_at')) $payload['updated_at'] = now();

            DB::table('recipe_ingredients')->insert($payload);
        }

        fclose($handle);
    }

    private function normalizeUnit(string $u): string
    {
        $u = strtolower(trim($u));

        return match ($u) {
            'pcs', 'piece', 'pieces' => 'pc',
            'tablespoon', 'tablespoons' => 'tbsp',
            'teaspoon', 'teaspoons' => 'tsp',
            'grams', 'gram' => 'g',
            'kilograms', 'kilogram' => 'kg',
            'milliliter', 'milliliters' => 'ml',
            'liter', 'liters' => 'l',
            default => $u,
        };
    }

    private function unitName(string $code): string
    {
        return match ($code) {
            'g' => 'gram',
            'kg' => 'kilogram',
            'ml' => 'milliliter',
            'l' => 'liter',
            'tsp' => 'teaspoon',
            'tbsp' => 'tablespoon',
            'pc' => 'piece',
            default => $code,
        };
    }
}
