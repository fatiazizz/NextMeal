<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class RecipeCuisineMethodSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/recipe-cuisine-method.csv');
        if (!File::exists($path)) {
            throw new \RuntimeException("Missing file: $path");
        }

        $handle = fopen($path, 'r');
        if (!$handle) {
            throw new \RuntimeException("Cannot open: $path");
        }

        try {
            $header = fgetcsv($handle);
            $header = array_map(function ($h) {
                $h = preg_replace('/^\xEF\xBB\xBF/', '', $h);
                return trim($h);
            }, $header);

            $requiredCols = ['recipe_name', 'cuisin', 'method', 'pre-time', 'serving'];
            foreach ($requiredCols as $col) {
                if (!in_array($col, $header, true)) {
                    throw new \RuntimeException("CSV header missing column: $col. Found: " . implode(', ', $header));
                }
            }

            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) !== count($header)) {
                    continue;
                }

                $data = array_combine($header, $row);

                $recipeName = trim($data['recipe_name'] ?? '');
                $cuisineName = trim($data['cuisin'] ?? '');
                $methodName = trim($data['method'] ?? '');
                $prepTime = trim($data['pre-time'] ?? '');
                $servingRaw = trim((string) ($data['serving'] ?? ''));

                if ($recipeName === '') {
                    continue;
                }

                $cuisineId = $cuisineName !== '' ? $this->ensureCuisineExists($cuisineName) : null;
                $methodId = $methodName !== '' ? $this->ensureCookingMethodExists($methodName) : null;

                $servings = 1;
                if ($servingRaw !== '' && is_numeric($servingRaw)) {
                    $servings = (int) $servingRaw;
                    if ($servings < 1) {
                        $servings = 1;
                    }
                }

                $recipe = DB::table('recipes')->where('recipe_name', $recipeName)->first();
                if ($recipe) {
                    DB::table('recipes')->where('recipe_id', $recipe->recipe_id)->update([
                        'cuisine_id' => $cuisineId,
                        'method_id' => $methodId,
                        'prep_time' => $prepTime !== '' ? $prepTime : null,
                        'servings' => $servings,
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('recipes')->insert([
                        'recipe_id' => (string) Str::uuid(),
                        'owner_user_id' => User::SYSTEM_USER_ID,
                        'recipe_name' => $recipeName,
                        'description' => null,
                        'instructions' => null,
                        'prep_time' => $prepTime !== '' ? $prepTime : null,
                        'servings' => $servings,
                        'image_url' => null,
                        'cuisine_id' => $cuisineId,
                        'recipe_category_id' => null,
                        'method_id' => $methodId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            fclose($handle);
            $this->command?->info('RecipeCuisineMethodSeeder: seeded recipe cuisine, method, prep_time, and servings.');
        } catch (\Throwable $e) {
            fclose($handle);
            throw $e;
        }
    }

    private function ensureCuisineExists(string $name): string
    {
        $existing = DB::table('cuisines')->where('name', $name)->value('cuisine_id');
        if ($existing) {
            return $existing;
        }

        $id = (string) Str::uuid();
        DB::table('cuisines')->insert([
            'cuisine_id' => $id,
            'name' => $name,
        ]);
        return $id;
    }

    private function ensureCookingMethodExists(string $name): string
    {
        $existing = DB::table('cooking_methods')->where('name', $name)->value('method_id');
        if ($existing) {
            return $existing;
        }

        $id = (string) Str::uuid();
        DB::table('cooking_methods')->insert([
            'method_id' => $id,
            'name' => $name,
        ]);
        return $id;
    }
}
