<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class IngredientController extends Controller
{
    /**
     * Get all system ingredients
     */
    public function index(Request $request): JsonResponse
    {
        $ingredients = Ingredient::with(['category', 'baseUnit', 'allowedUnits'])
            ->orderBy('name')
            ->get()
            ->map(function ($ingredient) {
                return $this->formatIngredient($ingredient);
            });

        return response()->json([
            'data' => $ingredients,
        ]);
    }

    /**
     * Search ingredients
     */
    public function search(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        $ingredients = Ingredient::with(['category', 'baseUnit', 'allowedUnits'])
            ->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($query) . '%'])
            ->orderBy('name')
            ->limit(50)
            ->get()
            ->map(function ($ingredient) {
                return $this->formatIngredient($ingredient);
            });

        return response()->json([
            'data' => $ingredients,
        ]);
    }

    /**
     * Get a single ingredient
     */
    public function show(Ingredient $ingredient): JsonResponse
    {
        $ingredient->load(['category', 'baseUnit', 'allowedUnits']);

        return response()->json([
            'data' => $this->formatIngredient($ingredient),
        ]);
    }

    /**
     * Format ingredient for API response
     */
    private function formatIngredient(Ingredient $ingredient): array
    {
        $baseUnit = $ingredient->baseUnit?->base_unit ?? 'pcs';
        $fromPivot = $ingredient->allowedUnits
            ? $ingredient->allowedUnits->pluck('unit_code')->values()->all()
            : [];
        // Always include base unit in allowed_units; merge with pivot (no duplicates)
        $allowedUnits = array_values(array_unique(array_merge([$baseUnit], $fromPivot)));

        return [
            'id' => $ingredient->ingredient_id,
            'name' => $ingredient->name,
            'category' => $ingredient->category?->name ?? 'Other',
            'unit' => $baseUnit,
            'allowed_units' => $allowedUnits,
            'default_days_until_expiry' => $ingredient->default_days_until_expiry,
        ];
    }
}
