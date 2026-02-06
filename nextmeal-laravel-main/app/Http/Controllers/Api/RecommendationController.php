<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use App\Models\User;
use App\Services\RecommendationLogicService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RecommendationController extends Controller
{
    public function __construct(
        private RecommendationLogicService $recommendationLogic
    ) {}

    /**
     * Get meal recommendations based on user's inventory.
     * Uses business logic service for ingredient matching % (mj, ms) and expiration urgency (uj).
     * All quantities are compared in ingredient base units.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $inventory = $user->inventory()
            ->with('ingredient')
            ->get();

        $recipes = Recipe::with(['recipeIngredients.ingredient', 'recipeIngredients.unit'])
            ->where(function ($query) use ($user) {
                $query->where('owner_user_id', User::SYSTEM_USER_ID)
                    ->orWhere('owner_user_id', $user->user_id);
            })
            ->get();

        $expirationReferenceDays = config('recommendation.expiration_reference_days', RecommendationLogicService::DEFAULT_EXPIRATION_REFERENCE_DAYS);

        $recommendations = [];
        foreach ($recipes as $recipe) {
            $result = $this->recommendationLogic->scoreRecipe($recipe, $inventory, $expirationReferenceDays);

            if ($result['matched_count'] > 0) {
                $recommendations[] = [
                    'id' => $recipe->recipe_id,
                    'name' => $recipe->recipe_name ?? 'Untitled Recipe',
                    'requiredIngredients' => $result['required_ingredients'],
                    'matchedIngredients' => $result['matched_ingredients'],
                    'missingIngredients' => $result['missing_ingredients'],
                    'matchPercentage' => $result['ms'],
                    'ingredientMatchingPercentages' => $result['mj'],
                    'expirationUrgency' => $result['uj'],
                    'expirationUrgencyAvg' => $result['expiration_urgency_avg'],
                    'usesExpiringIngredients' => $result['expiration_urgency_avg'] > 0,
                    'prepTime' => $recipe->prep_time ?? '',
                    'servings' => $recipe->servings ?? 1,
                    'imageUrl' => $recipe->image_url,
                    'ownerUserId' => $recipe->owner_user_id,
                ];
            }
        }

        usort($recommendations, function ($a, $b) {
            if ($a['usesExpiringIngredients'] && ! $b['usesExpiringIngredients']) {
                return -1;
            }
            if (! $a['usesExpiringIngredients'] && $b['usesExpiringIngredients']) {
                return 1;
            }
            return $b['matchPercentage'] <=> $a['matchPercentage'];
        });

        $inventoryByIngredient = $this->recommendationLogic->aggregateInventoryByIngredient($inventory);

        return response()->json([
            'data' => $recommendations,
            'meta' => [
                'total_recipes' => count($recommendations),
                'inventory_items' => count($inventoryByIngredient),
                'expiration_reference_days' => $expirationReferenceDays,
            ],
        ]);
    }
}
