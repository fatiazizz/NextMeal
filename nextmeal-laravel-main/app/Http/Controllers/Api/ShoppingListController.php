<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShoppingList;
use App\Models\Ingredient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ShoppingListController extends Controller
{
    /**
     * Get all shopping list items for authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $items = $request->user()
            ->shoppingList()
            ->with(['ingredient', 'unit'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($item) {
                return $this->formatShoppingItem($item);
            });

        return response()->json([
            'data' => $items,
        ]);
    }

    /**
     * Add item to shopping list
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'unit' => ['required', 'string', 'max:20'],
            'quantity' => ['required', 'numeric', 'min:0.001'],
            'checked' => ['boolean'],
            'from_recommendations' => ['boolean'],
            'ingredient_id' => ['nullable', 'uuid', 'exists:ingredients,ingredient_id'],
        ]);

        // Use provided ingredient_id when adding from autocomplete, otherwise find by name
        $ingredient = null;
        if (!empty($validated['ingredient_id'])) {
            $ingredient = Ingredient::find($validated['ingredient_id']);
        }
        if (!$ingredient) {
            $ingredient = Ingredient::whereRaw('LOWER(name) = ?', [strtolower($validated['name'])])->first();
        }

        $item = ShoppingList::create([
            'user_id' => $request->user()->user_id,
            'ingredient_id' => $ingredient?->ingredient_id,
            'quantity' => $validated['quantity'],
            'unit_code' => $validated['unit'],
            'is_checked' => $validated['checked'] ?? false,
        ]);

        // Store additional info in a way we can retrieve it
        // For now, we'll use the ingredient relationship or create a custom attribute
        $item->load(['ingredient', 'unit']);

        return response()->json([
            'data' => $this->formatShoppingItem($item, $validated),
            'message' => 'Item added to shopping list',
        ], 201);
    }

    /**
     * Update shopping list item
     */
    public function update(Request $request, ShoppingList $shoppingList): JsonResponse
    {
        // Ensure user owns this item
        if ($shoppingList->user_id !== $request->user()->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'unit' => ['sometimes', 'string', 'max:20'],
            'quantity' => ['sometimes', 'numeric', 'min:0.001'],
            'checked' => ['boolean'],
        ]);

        $updateData = [];

        if (isset($validated['quantity'])) {
            $updateData['quantity'] = $validated['quantity'];
        }
        if (isset($validated['unit'])) {
            $updateData['unit_code'] = $validated['unit'];
        }
        if (isset($validated['checked'])) {
            $updateData['is_checked'] = $validated['checked'];
        }

        $shoppingList->update($updateData);
        $shoppingList->load(['ingredient', 'unit']);

        return response()->json([
            'data' => $this->formatShoppingItem($shoppingList),
        ]);
    }

    /**
     * Delete shopping list item
     */
    public function destroy(Request $request, ShoppingList $shoppingList): JsonResponse
    {
        // Ensure user owns this item
        if ($shoppingList->user_id !== $request->user()->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $shoppingList->delete();

        return response()->json([
            'message' => 'Item removed from shopping list',
        ]);
    }

    /**
     * Toggle checked status
     */
    public function toggleChecked(Request $request, ShoppingList $shoppingList): JsonResponse
    {
        // Ensure user owns this item
        if ($shoppingList->user_id !== $request->user()->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $shoppingList->update([
            'is_checked' => !$shoppingList->is_checked,
        ]);

        $shoppingList->load(['ingredient', 'unit']);

        return response()->json([
            'data' => $this->formatShoppingItem($shoppingList),
        ]);
    }

    /**
     * Clear all checked items
     */
    public function clearChecked(Request $request): JsonResponse
    {
        $request->user()
            ->shoppingList()
            ->where('is_checked', true)
            ->delete();

        return response()->json([
            'message' => 'Checked items cleared',
        ]);
    }

    /**
     * Format shopping list item for API response
     */
    private function formatShoppingItem(ShoppingList $item, array $extra = []): array
    {
        return [
            'id' => $item->shopping_list_id,
            'name' => $item->ingredient?->ingredient_name ?? $extra['name'] ?? '',
            'category' => $item->ingredient?->category?->name ?? $extra['category'] ?? 'Other',
            'unit' => $item->unit_code,
            'quantity' => (float) $item->quantity,
            'checked' => (bool) $item->is_checked,
            'fromRecommendations' => $extra['from_recommendations'] ?? false,
            'userId' => $item->user_id,
            'createdAt' => $item->created_at?->toISOString(),
            'updatedAt' => $item->updated_at?->toISOString(),
        ];
    }
}
