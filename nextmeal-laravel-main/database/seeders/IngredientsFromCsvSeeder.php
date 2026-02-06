<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class IngredientsFromCsvSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/Ingredients.csv');
        if (!File::exists($path)) {
            throw new \RuntimeException("Missing file: $path");
        }

        $handle = fopen($path, 'rb');
        if (!$handle) {
            throw new \RuntimeException("Cannot open: $path");
        }

        DB::beginTransaction();

        try {
            // ---------- 1) Read + normalize header ----------
            $headerRaw = fgetcsv($handle);
            if ($headerRaw === false) {
                throw new \RuntimeException("Empty CSV or unreadable header: $path");
            }

            $headerRaw = array_map([$this, 'normalizeHeaderCell'], $headerRaw);

            // Map header -> canonical keys (case-insensitive + BOM safe)
            // We accept a few variants to stop your CSV from breaking seeding.
            $canonMap = [
                'ingredient' => 'Ingredient',
                'unit' => 'Unit',
                'category' => 'Category',
                'other measurement units (suggested)' => 'Other measurement units (suggested)',
                'other measurement units' => 'Other measurement units (suggested)',
                'other units' => 'Other measurement units (suggested)',
            ];

            // Build a lookup: canonicalKey => index
            $indexByKey = [];
            foreach ($headerRaw as $i => $h) {
                $key = mb_strtolower($h);
                $key = $this->stripUtf8Bom($key);
                $key = trim($key);

                if (isset($canonMap[$key])) {
                    $indexByKey[$canonMap[$key]] = $i;
                }
            }

            // Required columns (canonical)
            foreach (['Ingredient', 'Unit', 'Category'] as $req) {
                if (!array_key_exists($req, $indexByKey)) {
                    $debugHeader = implode(' | ', $headerRaw);
                    throw new \RuntimeException("CSV header missing column: $req. Parsed header: [$debugHeader]");
                }
            }

            // ---------- 2) Cache maps to avoid repeated queries ----------
            $categoryCache = [];   // name => id
            $ingredientCache = []; // name => id
            $unitCache = [];       // unit_code => true

            // preload existing units/categories/ingredients (optional but faster)
            DB::table('units')->select('unit_code')->orderBy('unit_code')->chunk(500, function ($rows) use (&$unitCache) {
                foreach ($rows as $r) $unitCache[$r->unit_code] = true;
            });

            DB::table('categories')->select('category_id', 'name')->orderBy('name')->chunk(500, function ($rows) use (&$categoryCache) {
                foreach ($rows as $r) $categoryCache[$r->name] = $r->category_id;
            });

            DB::table('ingredients')->select('ingredient_id', 'name')->orderBy('name')->chunk(500, function ($rows) use (&$ingredientCache) {
                foreach ($rows as $r) $ingredientCache[$r->name] = $r->ingredient_id;
            });

            // ---------- 3) Read rows ----------
            while (($row = fgetcsv($handle)) !== false) {
                if (!$row || count($row) === 0) continue;

                $ingredientName = $this->getCol($row, $indexByKey, 'Ingredient');
                $unitCode       = $this->getCol($row, $indexByKey, 'Unit');
                $categoryName   = $this->getCol($row, $indexByKey, 'Category');
                $others         = $this->getCol($row, $indexByKey, 'Other measurement units (suggested)');

                $ingredientName = trim($ingredientName);
                $unitCode       = trim($unitCode);
                $categoryName   = trim($categoryName);
                $others         = trim($others);

                if ($ingredientName === '') continue;

                // Parse suggested units once so we can reuse them
                $suggestedUnits = $this->extractUnits($others);

                // ---------- Category ----------
                $categoryId = null;
                if ($categoryName !== '') {
                    if (isset($categoryCache[$categoryName])) {
                        $categoryId = $categoryCache[$categoryName];
                    } else {
                        $categoryId = (string) Str::uuid();
                        DB::table('categories')->insert([
                            'category_id' => $categoryId,
                            'name'        => $categoryName,
                            'created_at'  => now(),
                        ]);
                        $categoryCache[$categoryName] = $categoryId;
                    }
                }

                // ---------- Units ----------
                // Unit اصلی
                if ($unitCode !== '') {
                    $this->ensureUnitExists($unitCode, $unitCache);
                }

                // Units پیشنهادی
                foreach ($suggestedUnits as $u) {
                    $this->ensureUnitExists($u, $unitCache);
                }

                // ---------- Ingredient ----------
                if (!isset($ingredientCache[$ingredientName])) {
                    $ingredientId = (string) Str::uuid();
                    DB::table('ingredients')->insert([
                        'ingredient_id' => $ingredientId,
                        'name'          => $ingredientName,
                        'category_id'   => $categoryId,
                        'created_at'    => now(),
                        'updated_at'    => now(),
                    ]);
                    $ingredientCache[$ingredientName] = $ingredientId;

                    // Insert base unit for this ingredient
                    if ($unitCode !== '') {
                        $normalizedUnit = $this->normalizeUnitCode($unitCode);
                        if ($normalizedUnit !== '') {
                            DB::table('ingredient_base_unit')->insertOrIgnore([
                                'ingredient_id' => $ingredientId,
                                'base_unit'     => $normalizedUnit,
                            ]);
                        }
                    }

                    // Insert allowed units (base + suggested) for this ingredient
                    $this->syncIngredientAllowedUnits($ingredientId, $unitCode, $suggestedUnits);
                } else {
                    // اگر قبلاً وجود داشته ولی category_id خالی بوده و الان داریم، آپدیت کن (اختیاری ولی مفید)
                    if ($categoryId !== null) {
                        DB::table('ingredients')
                            ->where('ingredient_id', $ingredientCache[$ingredientName])
                            ->whereNull('category_id')
                            ->update(['category_id' => $categoryId, 'updated_at' => now()]);
                    }

                    // Update or insert base unit if missing
                    if ($unitCode !== '') {
                        $normalizedUnit = $this->normalizeUnitCode($unitCode);
                        $existingIngredientId = $ingredientCache[$ingredientName];
                        if ($normalizedUnit !== '') {
                            DB::table('ingredient_base_unit')->insertOrIgnore([
                                'ingredient_id' => $existingIngredientId,
                                'base_unit'     => $normalizedUnit,
                            ]);
                        }
                    }

                    // Ensure allowed units (base + suggested) exist for existing ingredient
                    $this->syncIngredientAllowedUnits($ingredientCache[$ingredientName], $unitCode, $suggestedUnits);
                }
            }

            fclose($handle);
            DB::commit();
        } catch (\Throwable $e) {
            if (is_resource($handle)) fclose($handle);
            DB::rollBack();
            throw $e;
        }
    }

    private function getCol(array $row, array $indexByKey, string $key): string
    {
        if (!isset($indexByKey[$key])) return '';
        $idx = $indexByKey[$key];
        if (!array_key_exists($idx, $row)) return '';
        return (string) $row[$idx];
    }

    private function normalizeHeaderCell(string $h): string
    {
        $h = $this->stripUtf8Bom($h);
        $h = trim($h);

        // بعضی CSVها کوتیشن اضافه یا کاراکترهای عجیب دارن
        $h = preg_replace('/\s+/', ' ', $h);
        return $h ?? '';
    }

    private function stripUtf8Bom(string $s): string
    {
        // Remove BOM at start of string if present
        return preg_replace('/^\xEF\xBB\xBF/', '', $s) ?? $s;
    }

    /**
     * اگر unit_code تو units نبود، با kind/base/factor درست ایجادش می‌کنه.
     * unitCache: برای جلوگیری از کوئری‌های تکراری.
     */
    private function ensureUnitExists(string $unitCode, array &$unitCache): void
    {
        $unitCode = trim($unitCode);
        if ($unitCode === '') return;

        // normalize common textual variants to compact codes
        $unitCode = $this->normalizeUnitCode($unitCode);

        if ($unitCode === '') return;

        if (isset($unitCache[$unitCode])) return;

        [$kind, $base, $factor] = $this->normalizeUnit($unitCode);

        // insert unit
        DB::table('units')->insert([
            'unit_code'      => $unitCode,
            'unit_kind'      => $kind,
            'base_unit'      => $base,
            'to_base_factor' => $factor,
        ]);
        $unitCache[$unitCode] = true;

        // ensure base exists too
        if ($base !== $unitCode && !isset($unitCache[$base])) {
            DB::table('units')->insert([
                'unit_code'      => $base,
                'unit_kind'      => $kind,
                'base_unit'      => $base,
                'to_base_factor' => 1.0,
            ]);
            $unitCache[$base] = true;
        }
    }

    /**
     * Ensure ingredient_allowed_units contains base unit and all suggested units for the ingredient.
     */
    private function syncIngredientAllowedUnits(string $ingredientId, string $unitCode, array $suggestedUnits): void
    {
        $allowed = [];

        $unitCode = trim($unitCode);
        if ($unitCode !== '') {
            $base = $this->normalizeUnitCode($unitCode);
            if ($base !== '') {
                $allowed[] = $base;
            }
        }

        foreach ($suggestedUnits as $u) {
            $u = trim($u);
            if ($u === '') continue;

            // suggestedUnits already normalized in extractUnits, but normalize again for safety
            $norm = $this->normalizeUnitCode($u);
            if ($norm !== '') {
                $allowed[] = $norm;
            }
        }

        $allowed = array_values(array_unique($allowed));

        foreach ($allowed as $code) {
            DB::table('ingredient_allowed_units')->insertOrIgnore([
                'ingredient_id' => $ingredientId,
                'unit_code'     => $code,
            ]);
        }
    }

    /**
     * واحدها رو از متن پیشنهادی بیرون می‌کشه (تمیزتر از قبل)
     */
    private function extractUnits(string $text): array
    {
        $text = trim($text);
        if ($text === '') return [];

        // unify separators
        $text = str_replace([',', ';', '|', "\n", "\r", "\t"], ' ', $text);

        $parts = preg_split('/\s+/', $text) ?: [];
        $units = [];

        foreach ($parts as $p) {
            $p = trim($p);
            if ($p === '') continue;

            // remove brackets/punctuation
            $p = preg_replace('/[()\[\]\.]/', '', $p) ?? '';
            $p = trim($p);
            if ($p === '') continue;

            $p = $this->normalizeUnitCode($p);

            // only keep short unit codes (g, kg, ml, tbsp, tsp, pcs, to_taste, ...)
            if ($p !== '' && strlen($p) <= 15 && preg_match('/^[a-zA-Z_]+$/', $p)) {
                $units[] = $p;
            }
        }

        return array_values(array_unique($units));
    }

    /**
     * Normalize textual units to compact unit codes used in DB.
     * Example: grams -> g, tablespoon -> tbsp, teaspoons -> tsp, pieces -> pcs
     */
    private function normalizeUnitCode(string $u): string
    {
        $u = strtolower(trim($u));
        $u = preg_replace('/[^a-z_]/', '', $u) ?? $u; // keep letters and underscore (e.g. to_taste)
        $u = trim($u);
        if ($u === '') return '';

        $aliases = [
            'gram' => 'g', 'grams' => 'g',
            'kilogram' => 'kg', 'kilograms' => 'kg',
            'milligram' => 'mg', 'milligrams' => 'mg',

            'milliliter' => 'ml', 'milliliters' => 'ml',
            'liter' => 'l', 'liters' => 'l',

            'teaspoon' => 'tsp', 'teaspoons' => 'tsp',
            'tablespoon' => 'tbsp', 'tablespoons' => 'tbsp',

            'cups' => 'cup', 'cup' => 'cup',

            'piece' => 'pcs', 'pieces' => 'pcs',
            'pc' => 'pcs', 'pcs' => 'pcs',
            'unit' => 'pcs', 'units' => 'pcs',
        ];

        return $aliases[$u] ?? $u;
    }

    /**
     * نگاشت unit_code -> (unit_kind, base_unit, to_base_factor)
     * هرچی ناشناخته بود: other + base=خودش + factor=1
     */
    private function normalizeUnit(string $u): array
    {
        $u = strtolower(trim($u));

        $map = [
            // mass (base: g)
            'g'  => ['mass', 'g', 1.0],
            'kg' => ['mass', 'g', 1000.0],
            'mg' => ['mass', 'g', 0.001],

            // volume (base: ml)
            'ml'   => ['volume', 'ml', 1.0],
            'l'    => ['volume', 'ml', 1000.0],
            'tsp'  => ['volume', 'ml', 4.92892],
            'tbsp' => ['volume', 'ml', 14.7868],
            'cup'  => ['volume', 'ml', 240.0],

            // count (base: pcs)
            'pcs' => ['count', 'pcs', 1.0],

            // qualitative
            'to_taste' => ['other', 'to_taste', 1.0],
        ];

        return $map[$u] ?? ['other', $u, 1.0];
    }
}
