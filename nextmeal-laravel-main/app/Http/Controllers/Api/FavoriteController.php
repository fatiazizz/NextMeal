<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
use App\Models\Recipe;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FavoriteController extends Controller
{
    /**
     * Get all favorite recipe IDs for authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $favoriteIds = $request->user()
            ->favorites()
            ->pluck('recipe_id')
            ->toArray();

        return response()->json([
            'data' => $favoriteIds,
        ]);
    }

    /**
     * Add recipe to favorites
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipe_id' => ['required', 'string', 'exists:recipes,recipe_id'],
        ]);

        // Check if already favorited
        $existing = Favorite::where('user_id', $request->user()->user_id)
            ->where('recipe_id', $validated['recipe_id'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Recipe already in favorites',
            ], 409);
        }

        Favorite::create([
            'user_id' => $request->user()->user_id,
            'recipe_id' => $validated['recipe_id'],
        ]);

        return response()->json([
            'message' => 'Recipe added to favorites',
        ], 201);
    }

    /**
     * Remove recipe from favorites
     */
    public function destroy(Request $request, string $recipeId): JsonResponse
    {
        $deleted = Favorite::where('user_id', $request->user()->user_id)
            ->where('recipe_id', $recipeId)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json([
            'message' => 'Recipe removed from favorites',
        ]);
    }

    /**
     * Check if recipe is favorite
     */
    public function check(Request $request, string $recipeId): JsonResponse
    {
        $isFavorite = Favorite::where('user_id', $request->user()->user_id)
            ->where('recipe_id', $recipeId)
            ->exists();

        return response()->json([
            'data' => [
                'is_favorite' => $isFavorite,
            ],
        ]);
    }
}
