<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use App\Models\RecipeIngredient;
use App\Models\Ingredient;
use App\Models\User;
use App\Models\Cuisine;
use App\Models\CookingMethod;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RecipeController extends Controller
{
    /**
     * Get all recipes (system + user's custom recipes)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get system recipes + user's own recipes
        $recipes = Recipe::with([
            'recipeIngredients.ingredient.allowedUnits',
            'recipeIngredients.ingredient.baseUnit',
            'recipeIngredients.unit',
            'recipeSteps',
            'cuisine',
            'recipeCategory',
            'cookingMethod',
            'owner',
        ])
            ->where(function ($query) use ($user) {
                $query->where('owner_user_id', User::SYSTEM_USER_ID)
                      ->orWhere('owner_user_id', $user->user_id);
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($recipe) {
                return $this->formatRecipe($recipe);
            });

        return response()->json([
            'data' => $recipes,
        ]);
    }

    /**
     * Get a single recipe
     */
    public function show(Request $request, Recipe $recipe): JsonResponse
    {
        $user = $request->user();

        // Check if user can view this recipe
        if ($recipe->owner_user_id !== User::SYSTEM_USER_ID && 
            $recipe->owner_user_id !== $user->user_id) {
            return response()->json(['message' => 'Recipe not found'], 404);
        }

        $recipe->load([
            'recipeIngredients.ingredient.allowedUnits',
            'recipeIngredients.ingredient.baseUnit',
            'recipeIngredients.unit',
            'recipeSteps',
            'cuisine',
            'recipeCategory',
            'cookingMethod',
            'owner',
        ]);

        return response()->json([
            'data' => $this->formatRecipe($recipe),
        ]);
    }

    /**
     * Create a new recipe
     */
    public function store(Request $request): JsonResponse
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'prep_time' => ['required', 'string', 'max:50'],
            'servings' => ['required', 'integer', 'min:1'],
            'instructions' => ['required', 'array', 'min:1'],
            'instructions.*' => ['string'],
            'image_url' => ['nullable', 'url', 'max:500'],
            'cuisine_id' => ['nullable', 'string', 'uuid', 'exists:cuisines,cuisine_id'],
            'method_id' => ['nullable', 'string', 'uuid', 'exists:cooking_methods,method_id'],
        ];

        // Accept either ingredients (id + qty + unit) or legacy required_ingredients
        if ($request->has('ingredients') && is_array($request->input('ingredients'))) {
            $rules['ingredients'] = ['required', 'array', 'min:1'];
            $rules['ingredients.*.ingredient_id'] = ['required', 'string', 'uuid', 'exists:ingredients,ingredient_id'];
            $rules['ingredients.*.quantity'] = ['required', 'numeric', 'min:0'];
            $rules['ingredients.*.unit'] = ['required', 'string', 'max:20'];
        } else {
            $rules['required_ingredients'] = ['required', 'array', 'min:1'];
            $rules['required_ingredients.*'] = ['string'];
            $rules['ingredient_details'] = ['nullable', 'array'];
        }

        $validated = $request->validate($rules);

        $recipe = Recipe::create([
            'owner_user_id' => $request->user()->user_id,
            'recipe_name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'prep_time' => $validated['prep_time'],
            'servings' => $validated['servings'],
            'instructions' => $validated['instructions'],
            'image_url' => $validated['image_url'] ?? null,
            'cuisine_id' => $validated['cuisine_id'] ?? null,
            'method_id' => $validated['method_id'] ?? null,
        ]);

        if (isset($validated['ingredients'])) {
            foreach ($validated['ingredients'] as $item) {
                $ingredient = Ingredient::with('allowedUnits', 'baseUnit')->find($item['ingredient_id']);
                if ($ingredient) {
                    $baseUnit = $ingredient->baseUnit?->base_unit ?? 'pcs';
                    $allowed = $ingredient->allowedUnits->pluck('unit_code')->push($baseUnit)->unique()->values()->all();
                    $unit = in_array($item['unit'], $allowed) ? $item['unit'] : $baseUnit;
                    RecipeIngredient::create([
                        'recipe_id' => $recipe->recipe_id,
                        'ingredient_id' => $ingredient->ingredient_id,
                        'required_quantity' => (float) $item['quantity'],
                        'required_unit' => $unit,
                    ]);
                }
            }
        } else {
            foreach ($validated['required_ingredients'] as $index => $ingredientName) {
                $ingredient = Ingredient::whereRaw('LOWER(name) = ?', [strtolower($ingredientName)])->first();
                if ($ingredient) {
                    $detail = $validated['ingredient_details'][$index] ?? [];
                    RecipeIngredient::create([
                        'recipe_id' => $recipe->recipe_id,
                        'ingredient_id' => $ingredient->ingredient_id,
                        'required_quantity' => $detail['quantity'] ?? 1,
                        'required_unit' => $detail['unit'] ?? 'pcs',
                    ]);
                }
            }
        }

        $recipe->load([
            'recipeIngredients.ingredient.allowedUnits',
            'recipeIngredients.ingredient.baseUnit',
            'recipeIngredients.unit',
            'recipeSteps',
            'cuisine',
            'recipeCategory',
            'cookingMethod',
            'owner',
        ]);

        return response()->json([
            'data' => $this->formatRecipe($recipe),
            'message' => 'Recipe created successfully',
        ], 201);
    }

    /**
     * Update a recipe
     */
    public function update(Request $request, Recipe $recipe): JsonResponse
    {
        $user = $request->user();

        // Check permission
        if (!$user->canEditRecipe($recipe)) {
            return response()->json(['message' => 'You do not have permission to edit this recipe'], 403);
        }

        $rules = [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'prep_time' => ['sometimes', 'string', 'max:50'],
            'servings' => ['sometimes', 'integer', 'min:1'],
            'instructions' => ['sometimes', 'array', 'min:1'],
            'instructions.*' => ['string'],
            'image_url' => ['nullable', 'url', 'max:500'],
            'cuisine_id' => ['nullable', 'string', 'uuid', 'exists:cuisines,cuisine_id'],
            'method_id' => ['nullable', 'string', 'uuid', 'exists:cooking_methods,method_id'],
        ];
        if ($request->has('ingredients') && is_array($request->input('ingredients'))) {
            $rules['ingredients'] = ['sometimes', 'array', 'min:1'];
            $rules['ingredients.*.ingredient_id'] = ['required', 'string', 'uuid', 'exists:ingredients,ingredient_id'];
            $rules['ingredients.*.quantity'] = ['required', 'numeric', 'min:0'];
            $rules['ingredients.*.unit'] = ['required', 'string', 'max:20'];
        } else {
            $rules['required_ingredients'] = ['sometimes', 'array', 'min:1'];
            $rules['required_ingredients.*'] = ['string'];
            $rules['ingredient_details'] = ['nullable', 'array'];
        }
        $validated = $request->validate($rules);

        $updateData = [];
        if (isset($validated['name'])) {
            $updateData['recipe_name'] = $validated['name'];
        }
        if (array_key_exists('description', $validated)) {
            $updateData['description'] = $validated['description'];
        }
        if (isset($validated['prep_time'])) {
            $updateData['prep_time'] = $validated['prep_time'];
        }
        if (isset($validated['servings'])) {
            $updateData['servings'] = $validated['servings'];
        }
        if (isset($validated['instructions'])) {
            $updateData['instructions'] = $validated['instructions'];
        }
        if (array_key_exists('image_url', $validated)) {
            $updateData['image_url'] = $validated['image_url'];
        }
        if (array_key_exists('cuisine_id', $validated)) {
            $updateData['cuisine_id'] = $validated['cuisine_id'];
        }
        if (array_key_exists('method_id', $validated)) {
            $updateData['method_id'] = $validated['method_id'];
        }
        $recipe->update($updateData);

        if (isset($validated['ingredients'])) {
            $recipe->recipeIngredients()->delete();
            foreach ($validated['ingredients'] as $item) {
                $ingredient = Ingredient::with('allowedUnits', 'baseUnit')->find($item['ingredient_id']);
                if ($ingredient) {
                    $baseUnit = $ingredient->baseUnit?->base_unit ?? 'pcs';
                    $allowed = $ingredient->allowedUnits->pluck('unit_code')->push($baseUnit)->unique()->values()->all();
                    $unit = in_array($item['unit'], $allowed) ? $item['unit'] : $baseUnit;
                    RecipeIngredient::create([
                        'recipe_id' => $recipe->recipe_id,
                        'ingredient_id' => $ingredient->ingredient_id,
                        'required_quantity' => (float) $item['quantity'],
                        'required_unit' => $unit,
                    ]);
                }
            }
        } elseif (isset($validated['required_ingredients'])) {
            $recipe->recipeIngredients()->delete();
            foreach ($validated['required_ingredients'] as $index => $ingredientName) {
                $ingredient = Ingredient::whereRaw('LOWER(name) = ?', [strtolower($ingredientName)])->first();
                if ($ingredient) {
                    $detail = $validated['ingredient_details'][$index] ?? [];
                    RecipeIngredient::create([
                        'recipe_id' => $recipe->recipe_id,
                        'ingredient_id' => $ingredient->ingredient_id,
                        'required_quantity' => $detail['quantity'] ?? 1,
                        'required_unit' => $detail['unit'] ?? 'pcs',
                    ]);
                }
            }
        }

        $recipe->load([
            'recipeIngredients.ingredient.allowedUnits',
            'recipeIngredients.ingredient.baseUnit',
            'recipeIngredients.unit',
            'recipeSteps',
            'cuisine',
            'recipeCategory',
            'cookingMethod',
            'owner',
        ]);

        return response()->json([
            'data' => $this->formatRecipe($recipe),
            'message' => 'Recipe updated successfully',
        ]);
    }

    /**
     * Delete a recipe
     */
    public function destroy(Request $request, Recipe $recipe): JsonResponse
    {
        $user = $request->user();

        // Check permission
        if (!$user->canDeleteRecipe($recipe)) {
            return response()->json(['message' => 'You do not have permission to delete this recipe'], 403);
        }

        // Delete related ingredients first
        $recipe->recipeIngredients()->delete();
        $recipe->favorites()->delete();
        $recipe->delete();

        return response()->json([
            'message' => 'Recipe deleted successfully',
        ]);
    }

    /**
     * Get recipe permissions for user
     */
    public function permissions(Request $request, Recipe $recipe): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'can_edit' => $user->canEditRecipe($recipe),
                'can_delete' => $user->canDeleteRecipe($recipe),
            ],
        ]);
    }

    /**
     * Get instructions array for recipe (from recipe_steps or legacy instructions column)
     */
    private function getInstructionsForRecipe(Recipe $recipe): array
    {
        if ($recipe->relationLoaded('recipeSteps') && $recipe->recipeSteps->isNotEmpty()) {
            return $recipe->recipeSteps->pluck('description')->values()->all();
        }

        return $recipe->instructions ?? [];
    }

    /**
     * Format recipe for API response
     */
    private function formatRecipe(Recipe $recipe): array
    {
        $ingredientsForForm = [];
        if ($recipe->relationLoaded('recipeIngredients')) {
            foreach ($recipe->recipeIngredients as $ri) {
                $ing = $ri->ingredient;
                if (!$ing) {
                    continue;
                }
                $ing->loadMissing(['allowedUnits', 'baseUnit']);
                $baseUnit = $ing->baseUnit?->base_unit ?? 'pcs';
                $allowed = $ing->allowedUnits->pluck('unit_code')->push($baseUnit)->unique()->values()->all();
                $ingredientsForForm[] = [
                    'ingredientId' => $ing->ingredient_id,
                    'ingredientName' => $ing->name,
                    'quantity' => (float) $ri->required_quantity,
                    'unit' => $ri->required_unit ?? $baseUnit,
                    'allowedUnits' => $allowed,
                ];
            }
        }

        return [
            'id' => $recipe->recipe_id,
            'name' => $recipe->recipe_name,
            'description' => $recipe->description ?? '',
            'prepTime' => $recipe->prep_time ?? '',
            'servings' => $recipe->servings ?? 1,
            'cuisine' => $recipe->cuisine?->name ?? null,
            'cuisineId' => $recipe->cuisine_id,
            'recipeCategory' => $recipe->recipeCategory?->name ?? null,
            'cookingMethod' => $recipe->cookingMethod?->name ?? null,
            'methodId' => $recipe->method_id,
            'requiredIngredients' => $recipe->required_ingredients,
            'ingredientDetails' => $recipe->ingredient_details,
            'ingredients' => $ingredientsForForm,
            'instructions' => $this->getInstructionsForRecipe($recipe),
            'imageUrl' => $recipe->image_url,
            'ownerUserId' => $recipe->owner_user_id ?? User::SYSTEM_USER_ID,
            'createdAt' => $recipe->created_at?->toISOString(),
            'updatedAt' => $recipe->updated_at?->toISOString(),
        ];
    }
}
