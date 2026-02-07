<?php

namespace App\Services;

use App\Models\Ingredient;
use App\Models\Inventory;
use App\Models\Recipe;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Recommendation business logic (separate from HTTP layer).
 *
 * 1. Ingredient matching % (mj, ms):
 *    - mj: For each required ingredient, percentage of available quantity in user's inventory
 *      vs quantity required (compared in base units). mj = min(available_base / required_base, 1).
 *    - ms: (sum of mj for all required ingredients / number of required ingredients) * 100.
 *
 * 2. Expiration urgency (uj):
 *    - h = expiration reference (e.g. 3 days).
 *    - dj = days remaining until expiration.
 *    - uj = (h - dj) / h when 0 <= dj <= h, else uj = 0.
 *    (So "expires today" and "expires in h days" are both considered in the window.)
 */
final class RecommendationLogicService
{
    /**
     * Default expiration reference window in days (h).
     */
    public const DEFAULT_EXPIRATION_REFERENCE_DAYS = 3;

    /**
     * Score a recipe against a user's inventory.
     * Quantities are converted to ingredient base units for comparison.
     *
     * @param  int  $expirationReferenceDays  Expiration reference (h) in days
     * @return array{ms: float, mj: array, uj: array, expiration_urgency_avg: float, required_ingredients: array, matched_ingredients: array, missing_ingredients: array}
     */
    public function scoreRecipe(Recipe $recipe, Collection $userInventory, int $expirationReferenceDays = self::DEFAULT_EXPIRATION_REFERENCE_DAYS): array
    {
        $recipe->loadMissing(['recipeIngredients.ingredient']);

        // Build inventory by ingredient_id: total base quantity and soonest expiration
        $inventoryByIngredient = $this->aggregateInventoryByIngredient($userInventory);

        $mj = [];       // per-ingredient match ratio (0..1)
        $uj = [];       // per-ingredient expiration urgency (0..1)
        $requiredList = [];
        $matchedList = [];
        $missingList = [];

        $requiredIngredients = $recipe->recipeIngredients;

        foreach ($requiredIngredients as $ri) {
            $ingredient = $ri->ingredient;
            if (!$ingredient) {
                continue;
            }

            $ingredientId = $ingredient->ingredient_id;
            $ingredientName = $ingredient->name ?? '';
            $requiredList[] = $ingredientName;

            // Required quantity in base unit
            $requiredQty = (float) $ri->required_quantity;
            $requiredUnit = $ri->required_unit ?? $ingredient->base_unit_code ?? 'pcs';
            $requiredInBase = $ingredient->convertToBaseQuantity($requiredQty, $requiredUnit);
            $requiredBase = (float) ($requiredInBase['base_quantity'] ?? $requiredQty);

            $availableBase = 0.0;
            $expirationDate = null;

            if (isset($inventoryByIngredient[$ingredientId])) {
                $availableBase = $inventoryByIngredient[$ingredientId]['total_base_quantity'];
                $expirationDate = $inventoryByIngredient[$ingredientId]['soonest_expiration_date'] ?? null;
                $matchedList[] = $ingredientName;
            } else {
                $missingList[] = $ingredientName;
            }

            // mj: percentage of available vs required (cap at 1)
            if ($requiredBase <= 0) {
                $mj[$ingredientId] = 1.0;
            } else {
                $ratio = $availableBase / $requiredBase;
                $mj[$ingredientId] = min(max($ratio, 0), 1.0);
            }

            // uj: expiration urgency (0 if dj not in (0, h])
            $uj[$ingredientId] = $this->expirationUrgency($expirationDate, $expirationReferenceDays);
        }

        $n = count($requiredList);
        $sumMj = array_sum($mj);
        $ms = $n > 0 ? ($sumMj / $n) * 100 : 0.0;

        $ujValues = array_values(array_filter($uj, fn ($v) => $v > 0));
        $expirationUrgencyAvg = count($ujValues) > 0 ? array_sum($ujValues) / count($ujValues) : 0.0;

        return [
            'ms' => round($ms, 2),
            'mj' => $mj,
            'uj' => $uj,
            'expiration_urgency_avg' => round($expirationUrgencyAvg, 4),
            'required_ingredients' => $requiredList,
            'matched_ingredients' => array_values(array_unique($matchedList)),
            'missing_ingredients' => array_values(array_unique($missingList)),
            'matched_count' => count(array_unique($matchedList)),
        ];
    }

    /**
     * Aggregate user inventory by ingredient_id: total base quantity and soonest expiration.
     * Uses stored base_quantity/base_unit; if missing, converts via ingredient.
     *
     * @return array<string, array{total_base_quantity: float, soonest_expiration_date: \Carbon\Carbon|null}>
     */
    public function aggregateInventoryByIngredient(Collection $userInventory): array
    {
        $byIngredient = [];

        foreach ($userInventory as $item) {
            $ingredientId = $item->ingredient_id;
            $ingredient = $item->relationLoaded('ingredient') ? $item->ingredient : $item->ingredient()->first();

            $baseQty = (float) $item->base_quantity;
            $baseUnit = $item->base_unit ?? null;

            if ($ingredient && ($baseUnit === null || $baseUnit === '')) {
                $converted = $ingredient->convertToBaseQuantity((float) $item->input_quantity, $item->input_unit ?? 'pcs');
                $baseQty = (float) ($converted['base_quantity'] ?? $item->base_quantity);
            }

            if (!isset($byIngredient[$ingredientId])) {
                $byIngredient[$ingredientId] = [
                    'total_base_quantity' => 0.0,
                    'soonest_expiration_date' => null,
                ];
            }

            $byIngredient[$ingredientId]['total_base_quantity'] += $baseQty;

            if ($item->expiration_date !== null) {
                $exp = $item->expiration_date instanceof Carbon
                    ? $item->expiration_date
                    : Carbon::parse($item->expiration_date);
                if ($byIngredient[$ingredientId]['soonest_expiration_date'] === null
                    || $exp->lt($byIngredient[$ingredientId]['soonest_expiration_date'])) {
                    $byIngredient[$ingredientId]['soonest_expiration_date'] = $exp;
                }
            }
        }

        return $byIngredient;
    }

    /**
     * Expiration urgency: uj = (h - dj) / h when 0 <= dj <= h, else 0.
     * dj = days remaining until expiration (from start of today).
     * Includes "expires today" (dj=0) and "expires in h days" (dj=h) so the expiring section stays consistent with the frontend.
     *
     * @param  \Carbon\Carbon|string|null  $expirationDate
     */
    public function expirationUrgency($expirationDate, int $h): float
    {
        if ($expirationDate === null || $h <= 0) {
            return 0.0;
        }

        $exp = $expirationDate instanceof Carbon
            ? $expirationDate
            : Carbon::parse($expirationDate);

        $today = Carbon::today();
        $dj = (int) $today->diffInDays($exp, false);

        if ($dj < 0 || $dj > $h) {
            return 0.0;
        }

        return ($h - $dj) / (float) $h;
    }

    /**
     * Apply recipe usage to user's inventory: deduct required amounts (in base units) from
     * inventory per ingredient. Remaining amount = max(0, available - required). Deduction
     * is applied FIFO by expiration (soonest first). Quantities are never stored as negative.
     *
     * @return array{deducted: array<string, float>, updated_count: int}
     */
    public function applyRecipeUsage(User $user, Recipe $recipe): array
    {
        $recipe->loadMissing(['recipeIngredients.ingredient']);
        $deducted = [];
        $updatedCount = 0;

        foreach ($recipe->recipeIngredients as $ri) {
            $ingredient = $ri->ingredient;
            if (! $ingredient) {
                continue;
            }

            $requiredQty = (float) $ri->required_quantity;
            $requiredUnit = $ri->required_unit ?? $ingredient->base_unit_code ?? 'pcs';
            $converted = $ingredient->convertToBaseQuantity($requiredQty, $requiredUnit);
            $requiredBase = (float) ($converted['base_quantity'] ?? $requiredQty);
            $baseUnit = $converted['base_unit'] ?? $ingredient->base_unit_code ?? $requiredUnit;

            $items = $user->inventory()
                ->where('ingredient_id', $ingredient->ingredient_id)
                ->orderByRaw('expiration_date IS NULL, expiration_date ASC')
                ->get();

            $totalAvailable = 0.0;
            foreach ($items as $item) {
                $base = (float) $item->base_quantity;
                $totalAvailable += $base;
            }

            $remainingBase = $totalAvailable - $requiredBase;
            if ($remainingBase < 0) {
                $remainingBase = 0.0;
            }
            $toDeduct = $totalAvailable - $remainingBase;

            $deducted[$ingredient->ingredient_id] = $toDeduct;

            $stillToDeduct = $toDeduct;
            foreach ($items as $item) {
                if ($stillToDeduct <= 0) {
                    break;
                }
                $baseQty = (float) $item->base_quantity;
                $take = min($baseQty, $stillToDeduct);
                $newBase = $baseQty - $take;
                $stillToDeduct -= $take;

                $item->base_quantity = $newBase;
                $item->input_quantity = $newBase;
                $item->input_unit = $item->base_unit ?? $baseUnit;
                $item->base_unit = $item->base_unit ?? $baseUnit;
                $item->last_updated = now();
                $item->save();
                $updatedCount++;
            }
        }

        return ['deducted' => $deducted, 'updated_count' => $updatedCount];
    }
}
