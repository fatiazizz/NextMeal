<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Reader\Exception as SpreadsheetReaderException;

class UnitsCategoriesIngredientsSeeder extends Seeder
{
    public function run(): void
    {
        $path = base_path('database/seeders/data/NextMeal_Ingredients_Extended.xlsx');
        if (!file_exists($path)) {
            throw new \RuntimeException("Missing file: {$path}");
        }

        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        // Header map
        $header = array_map(fn($v) => trim((string)$v), $rows[1] ?? []);
        $colIngredient = $this->findCol($header, 'Ingredient');
        $colUnit = $this->findCol($header, 'Unit');
        $colCategory = $this->findCol($header, 'Category');
        $colOther = $this->findCol($header, 'Other measurement units (suggested)');

        if (!$colIngredient || !$colUnit || !$colCategory) {
            throw new \RuntimeException("Excel headers not found. Expected: Ingredient, Unit, Category");
        }

        $categories = []; // name => uuid
        $units = [];      // code => name
        $ingredients = []; // name => [category_name, default_unit, other_units]

        // Parse rows
        for ($i = 2; $i <= count($rows); $i++) {
            $r = $rows[$i] ?? null;
            if (!$r) continue;

            $name = trim((string)($r[$colIngredient] ?? ''));
            if ($name === '') continue;

            $unit = strtolower(trim((string)($r[$colUnit] ?? '')));
            $category = trim((string)($r[$colCategory] ?? ''));
            $other = trim((string)($r[$colOther] ?? ''));

            if ($category !== '') {
                $categories[$category] ??= (string) Str::uuid();
            }

            // units from main unit + suggested units
            if ($unit !== '') {
                $units[$this->normalizeUnit($unit)] = $this->unitName($this->normalizeUnit($unit));
            }
            if ($other !== '') {
                foreach (preg_split('/\s*,\s*/', $other) as $u) {
                    $u = strtolower(trim($u));
                    if ($u === '') continue;
                    $u = $this->normalizeUnit($u);
                    $units[$u] = $this->unitName($u);
                }
            }

            $ingredients[$name] = [
                'category' => $category ?: null,
                'default_unit' => $unit ? $this->normalizeUnit($unit) : null,
                'other_units' => $other ?: null,
            ];
        }

        // 1) categories
        if (Schema::hasTable('categories')) {
            foreach ($categories as $catName => $catId) {
                // اگر name یونیکه: updateOrInsert روی name
                DB::table('categories')->updateOrInsert(
                    ['name' => $catName],
                    ['category_id' => $catId]
                );
            }
        }

        // 2) units
        if (Schema::hasTable('units')) {
            foreach ($units as $code => $nm) {
                // جدول units توی تو: unit_code (PK)
                DB::table('units')->updateOrInsert(
                    ['unit_code' => $code],
                    ['name' => $nm]
                );
            }
        }

        // 3) ingredients
        if (Schema::hasTable('ingredients')) {
            $catMap = Schema::hasTable('categories')
                ? DB::table('categories')->pluck('category_id', 'name')->toArray()
                : [];

            $hasCategoryId = Schema::hasColumn('ingredients', 'category_id');
            $hasDefaultUnit = Schema::hasColumn('ingredients', 'default_unit');
            $hasDefaultUnitCode = Schema::hasColumn('ingredients', 'default_unit_code');
            $hasBaseUnit = Schema::hasColumn('ingredients', 'base_unit');
            $hasNotes = Schema::hasColumn('ingredients', 'notes');

            foreach ($ingredients as $ingName => $meta) {
                $payload = ['ingredient_id' => (string) Str::uuid()];

                if ($hasCategoryId) {
                    $payload['category_id'] = $meta['category'] ? ($catMap[$meta['category']] ?? null) : null;
                }

                // اگر تو جدول ingredients ستونی برای یونیت پیش‌فرض داری، یکی‌ش رو پر می‌کنیم
                $unitCode = $meta['default_unit'];
                if ($unitCode) {
                    if ($hasDefaultUnit) $payload['default_unit'] = $unitCode;
                    if ($hasDefaultUnitCode) $payload['default_unit_code'] = $unitCode;
                    if ($hasBaseUnit) $payload['base_unit'] = $unitCode;
                }

                if ($hasNotes && $meta['other_units']) {
                    $payload['notes'] = 'Suggested units: ' . $meta['other_units'];
                }

                DB::table('ingredients')->updateOrInsert(
                    ['name' => $ingName],
                    $payload
                );
            }
        }
    }

    private function findCol(array $headerRow, string $name): ?string
    {
        foreach ($headerRow as $col => $val) {
            if (trim((string)$val) === $name) return $col;
        }
        return null;
    }

    private function normalizeUnit(string $u): string
    {
        $u = strtolower(trim($u));

        // نرمال‌سازی‌های رایج
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
            default => $code, // هرچی ناشناخته بود همون کد رو اسم می‌ذاریم
        };
    }
}
