<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Seeds default_days_until_expiry for each ingredient from ingredient-expire.csv.
 * User-provided expiration dates always take priority; defaults apply only when user skips entering expiration.
 */
class IngredientExpireDefaultsSeeder extends Seeder
{
    /** Default fallback when ingredient has no entry in CSV (days) */
    private const GLOBAL_FALLBACK_DAYS = 7;

    public function run(): void
    {
        $path = database_path('seeders/data/ingredient-expire.csv');
        if (!File::exists($path)) {
            throw new \RuntimeException("Missing file: {$path}");
        }

        $handle = fopen($path, 'rb');
        if (!$handle) {
            throw new \RuntimeException("Cannot open: {$path}");
        }

        $header = fgetcsv($handle);
        if ($header === false || strtolower(trim($header[0] ?? '')) !== 'ingredient') {
            fclose($handle);
            throw new \RuntimeException("Expected CSV header: Ingredient, default_expire_days");
        }

        $updates = [];
        while (($row = fgetcsv($handle)) !== false) {
            $name = trim($row[0] ?? '');
            if ($name === '') continue;

            $days = isset($row[1]) ? (int) $row[1] : null;
            if ($days === null || $days < 0) continue;

            $updates[] = ['name' => $name, 'days' => $days];
        }
        fclose($handle);

        foreach ($updates as $item) {
            DB::table('ingredients')
                ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($item['name']))])
                ->update(['default_days_until_expiry' => $item['days']]);
        }
    }
}
