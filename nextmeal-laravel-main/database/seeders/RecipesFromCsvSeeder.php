<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use App\Models\User;

class RecipesFromCsvSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/recipe_ingredients.csv');
        if (!File::exists($path)) {
            throw new \RuntimeException("Missing file: $path");
        }

        $handle = fopen($path, 'r');
        if (!$handle) {
            throw new \RuntimeException("Cannot open: $path");
        }

        DB::beginTransaction();

        try {
            $header = fgetcsv($handle);
            // Strip BOM and trim headers
            $header = array_map(function($h) {
                $h = preg_replace('/^\xEF\xBB\xBF/', '', $h); // Remove UTF-8 BOM
                return trim($h);
            }, $header);

            $requiredCols = ['recipe_name', 'ingredient', 'quantity', 'unit'];
            foreach ($requiredCols as $col) {
                if (!in_array($col, $header, true)) {
                    throw new \RuntimeException("CSV header missing column: $col. Found: " . implode(', ', $header));
                }
            }

            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) !== count($header)) continue;

                $data = array_combine($header, $row);

                $recipeName     = trim($data['recipe_name'] ?? '');
                $ingredientName = trim($data['ingredient'] ?? '');
                $qtyRaw         = trim((string)($data['quantity'] ?? ''));
                $unitCode       = trim($data['unit'] ?? '');

                if ($recipeName === '' || $ingredientName === '') continue;

                // required_quantity NOT NULL => اگر عدد نیست یا خالیه، این ردیف رو رد می‌کنیم
                if ($qtyRaw === '' || !is_numeric($qtyRaw)) continue;
                $quantity = (float) $qtyRaw;

                // required_unit NOT NULL => اگر واحد خالیه، پیش‌فرض pcs
                if ($unitCode === '') $unitCode = 'pcs';

                // 1) ensure unit exists (طبق schema واقعی)
                $this->ensureUnitExistsSimple($unitCode);

                // 2) recipe (recipes.recipe_name)
                $recipeId = DB::table('recipes')->where('recipe_name', $recipeName)->value('recipe_id');
                if (!$recipeId) {
                    $recipeId = (string) Str::uuid();
                    DB::table('recipes')->insert([
                        'recipe_id'        => $recipeId,
                        'owner_user_id'    => User::SYSTEM_USER_ID, // System recipes owned by system user
                        'recipe_name'      => $recipeName,
                        'instructions'     => null,
                        'cuisine_id'       => null,
                        'recipe_category_id'=> null,
                        'method_id'        => null,
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ]);
                }

                // 3) ingredient (اگر از Ingredients.csv نیومده بود، بساز)
                $ingredientId = DB::table('ingredients')->where('name', $ingredientName)->value('ingredient_id');
                if (!$ingredientId) {
                    $ingredientId = (string) Str::uuid();
                    DB::table('ingredients')->insert([
                        'ingredient_id' => $ingredientId,
                        'name'          => $ingredientName,
                        'category_id'   => null,
                        'created_at'    => now(),
                        'updated_at'    => now(),
                    ]);
                }

                // 4) pivot recipe_ingredients مطابق schema واقعی
                $exists = DB::table('recipe_ingredients')
                    ->where('recipe_id', $recipeId)
                    ->where('ingredient_id', $ingredientId)
                    ->exists();

                if (!$exists) {
                    DB::table('recipe_ingredients')->insert([
                        'recipe_ingredient_id' => (string) Str::uuid(),
                        'recipe_id'            => $recipeId,
                        'ingredient_id'        => $ingredientId,
                        'required_quantity'    => $quantity,
                        'required_unit'        => $unitCode,
                        'created_at'           => now(),
                        'updated_at'           => now(),
                    ]);
                }
            }

            fclose($handle);
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * نسخه ساده برای units (همون منطق kind/base/factor پایه)
     */
    private function ensureUnitExistsSimple(string $unitCode): void
    {
        $unitCode = trim($unitCode);
        if ($unitCode === '') return;

        $exists = DB::table('units')->where('unit_code', $unitCode)->exists();
        if ($exists) return;

        // حداقل قابل قبول برای NOT NULL ها:
        $u = strtolower($unitCode);

        $map = [
            'g'  => ['mass', 'g', 1.0],
            'kg' => ['mass', 'g', 1000.0],
            'mg' => ['mass', 'g', 0.001],
            'ml' => ['volume', 'ml', 1.0],
            'l'  => ['volume', 'ml', 1000.0],
            'tsp'=> ['volume', 'ml', 4.92892],
            'tbsp'=>['volume', 'ml', 14.7868],
            'cup'=> ['volume', 'ml', 240.0],
            'pcs'=> ['count', 'pcs', 1.0],
        ];

        [$kind, $base, $factor] = $map[$u] ?? ['other', $u, 1.0];

        DB::table('units')->insert([
            'unit_code'      => $unitCode,
            'unit_kind'      => $kind,
            'base_unit'      => $base,
            'to_base_factor' => $factor,
        ]);

        if ($base !== $unitCode) {
            $baseExists = DB::table('units')->where('unit_code', $base)->exists();
            if (!$baseExists) {
                DB::table('units')->insert([
                    'unit_code'      => $base,
                    'unit_kind'      => $kind,
                    'base_unit'      => $base,
                    'to_base_factor' => 1.0,
                ]);
            }
        }
    }
}
