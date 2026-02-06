<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class RecipeStepsFromCsvSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/recipe-steps.csv');
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
            $header = array_map(function ($h) {
                $h = preg_replace('/^\xEF\xBB\xBF/', '', $h);
                return trim($h);
            }, $header);

            $requiredCols = ['recipe_name', 'steps'];
            foreach ($requiredCols as $col) {
                if (!in_array($col, $header, true)) {
                    throw new \RuntimeException("CSV header missing column: $col. Found: " . implode(', ', $header));
                }
            }

            $recipeIdCache = [];
            $stepNumbersByRecipe = [];

            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) !== count($header)) {
                    continue;
                }

                $data = array_combine($header, $row);

                $recipeName = trim($data['recipe_name'] ?? '');
                $stepText = trim($data['steps'] ?? '');

                if ($recipeName === '' || $stepText === '') {
                    continue;
                }

                if (!isset($recipeIdCache[$recipeName])) {
                    $recipeId = DB::table('recipes')->where('recipe_name', $recipeName)->value('recipe_id');
                    if (!$recipeId) {
                        continue;
                    }
                    $recipeIdCache[$recipeName] = $recipeId;
                    $stepNumbersByRecipe[$recipeName] = 0;
                }

                $recipeId = $recipeIdCache[$recipeName];
                $stepNumbersByRecipe[$recipeName]++;
                $stepNumber = $stepNumbersByRecipe[$recipeName];

                $exists = DB::table('recipe_steps')
                    ->where('recipe_id', $recipeId)
                    ->where('step_number', $stepNumber)
                    ->exists();

                if (!$exists) {
                    DB::table('recipe_steps')->insert([
                        'recipe_step_id' => (string) Str::uuid(),
                        'recipe_id'      => $recipeId,
                        'step_number'    => $stepNumber,
                        'description'    => $stepText,
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);
                }
            }

            fclose($handle);
            DB::commit();
        } catch (\Throwable $e) {
            if (is_resource($handle)) {
                fclose($handle);
            }
            DB::rollBack();
            throw $e;
        }
    }
}
