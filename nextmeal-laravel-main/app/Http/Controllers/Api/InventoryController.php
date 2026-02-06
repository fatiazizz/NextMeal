<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Ingredient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InventoryController extends Controller
{
    /**
     * Get all inventory items for authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $inventory = $request->user()
            ->inventory()
            ->with(['ingredient', 'inputUnitRelation'])
            ->orderBy('expiration_date', 'asc')
            ->get()
            ->map(function ($item) {
                return $this->formatInventoryItem($item);
            });

        return response()->json([
            'data' => $inventory,
        ]);
    }

    /**
     * Get a single inventory item
     */
    public function show(Request $request, Inventory $inventory): JsonResponse
    {
        // Ensure user owns this inventory item
        if ($inventory->user_id !== $request->user()->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $inventory->load(['ingredient', 'inputUnitRelation']);

        return response()->json([
            'data' => $this->formatInventoryItem($inventory),
        ]);
    }

    /**
     * Add new inventory item
     */
    public function store(Request $request): JsonResponse
    {
        $request->merge(['expiry_date' => $request->input('expiry_date') ?: null]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'numeric', 'min:0.001'],
            'unit' => ['required', 'string', 'max:20'],
            'expiry_date' => ['nullable', 'date'],
            'category' => ['nullable', 'string'],
            'minimum_threshold' => ['nullable', 'numeric', 'min:0'],
        ]);

        // Find ingredient (with base unit for conversion)
        $ingredient = Ingredient::with('baseUnit')
            ->whereRaw('LOWER(name) = ?', [strtolower($validated['name'])])
            ->first();

        if (!$ingredient) {
            return response()->json([
                'message' => 'Ingredient not found in system',
            ], 422);
        }

        // Validate that selected unit is allowed for this ingredient
        $allowedUnits = $ingredient->allowedUnits()->pluck('unit_code')->all();
        $ingredientBaseUnit = $ingredient->base_unit_code;
        if ($ingredientBaseUnit !== null && !in_array($ingredientBaseUnit, $allowedUnits, true)) {
            $allowedUnits[] = $ingredientBaseUnit;
        }
        $allowedUnits = array_values(array_unique($allowedUnits));

        if (!empty($allowedUnits) && !in_array($validated['unit'], $allowedUnits, true)) {
            return response()->json([
                'message' => 'Selected unit is not allowed for this ingredient',
                'allowed_units' => $allowedUnits,
            ], 422);
        }

        // Convert user input (input_unit) to ingredient's base unit for storage
        $converted = $ingredient->convertToBaseQuantity((float) $validated['quantity'], $validated['unit']);

        // User-provided expiry takes priority; when skipped or empty, use ingredient default or 7 days
        $expiryInput = $validated['expiry_date'] ?? null;
        $expiryInput = ($expiryInput === '' || $expiryInput === null) ? null : $expiryInput;
        $expirationDate = $expiryInput
            ? $expiryInput
            : now()->addDays($ingredient->default_days_until_expiry ?? 7)->format('Y-m-d');

        // Check if user already has this ingredient in inventory
        $existing = Inventory::where('user_id', $request->user()->user_id)
            ->where('ingredient_id', $ingredient->ingredient_id)
            ->first();

        if ($existing) {
            $existing->update([
                'input_quantity' => $validated['quantity'],
                'input_unit' => $validated['unit'],
                'base_quantity' => $converted['base_quantity'],
                'base_unit' => $converted['base_unit'],
                'minimum_threshold' => $validated['minimum_threshold'] ?? null,
                'expiration_date' => $expirationDate,
                'last_updated' => now(),
            ]);

            $existing->load(['ingredient', 'inputUnitRelation']);

            return response()->json([
                'data' => $this->formatInventoryItem($existing),
                'message' => 'Inventory updated',
            ]);
        }

        // Create new inventory item (store input as user entered, base for calculations)
        $inventory = Inventory::create([
            'user_id' => $request->user()->user_id,
            'ingredient_id' => $ingredient->ingredient_id,
            'input_quantity' => $validated['quantity'],
            'input_unit' => $validated['unit'],
            'base_quantity' => $converted['base_quantity'],
            'base_unit' => $converted['base_unit'],
            'minimum_threshold' => $validated['minimum_threshold'] ?? null,
            'expiration_date' => $expirationDate,
            'last_updated' => now(),
        ]);

        $inventory->load(['ingredient', 'inputUnitRelation']);

        return response()->json([
            'data' => $this->formatInventoryItem($inventory),
            'message' => 'Inventory item added',
        ], 201);
    }

    /**
     * Update inventory item
     */
    public function update(Request $request, Inventory $inventory): JsonResponse
    {
        // Ensure user owns this inventory item
        if ($inventory->user_id !== $request->user()->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'quantity' => ['sometimes', 'numeric', 'min:0.001'],
            'unit' => ['sometimes', 'string', 'max:20'],
            'expiry_date' => ['sometimes', 'date'],
            'minimum_threshold' => ['nullable', 'numeric', 'min:0'],
        ]);

        $updateData = ['last_updated' => now()];

        if (array_key_exists('quantity', $validated) || array_key_exists('unit', $validated)) {
            $newQuantity = isset($validated['quantity']) ? (float) $validated['quantity'] : (float) $inventory->input_quantity;
            $newInputUnit = isset($validated['unit']) ? $validated['unit'] : $inventory->input_unit;
            $ingredient = $inventory->ingredient()->with('baseUnit')->first();
            if ($ingredient) {
                $converted = $ingredient->convertToBaseQuantity($newQuantity, $newInputUnit);
                $updateData['input_quantity'] = $newQuantity;
                $updateData['input_unit'] = $newInputUnit;
                $updateData['base_quantity'] = $converted['base_quantity'];
                $updateData['base_unit'] = $converted['base_unit'];
            } else {
                $updateData['input_quantity'] = $newQuantity;
                $updateData['input_unit'] = $newInputUnit;
                $updateData['base_quantity'] = $newQuantity;
                $updateData['base_unit'] = $newInputUnit;
            }
        }

        if (isset($validated['expiry_date'])) {
            $updateData['expiration_date'] = $validated['expiry_date'];
        }

        if (array_key_exists('minimum_threshold', $validated)) {
            $updateData['minimum_threshold'] = $validated['minimum_threshold'];
        }

        $inventory->update($updateData);
        $inventory->load(['ingredient', 'inputUnitRelation']);

        return response()->json([
            'data' => $this->formatInventoryItem($inventory),
        ]);
    }

    /**
     * Delete inventory item
     */
    public function destroy(Request $request, Inventory $inventory): JsonResponse
    {
        // Ensure user owns this inventory item
        if ($inventory->user_id !== $request->user()->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $inventory->delete();

        return response()->json([
            'message' => 'Inventory item deleted',
        ]);
    }

    /**
     * Get low stock items
     */
    public function lowStock(Request $request): JsonResponse
    {
        $lowStockItems = $request->user()
            ->inventory()
            ->with(['ingredient', 'inputUnitRelation'])
            ->get()
            ->filter(function ($item) {
                return $item->isLowStock();
            })
            ->map(function ($item) {
                return $this->formatInventoryItem($item);
            })
            ->values();

        return response()->json([
            'data' => $lowStockItems,
        ]);
    }

    /**
     * Format inventory item for API response
     */
    private function formatInventoryItem(Inventory $item): array
    {
        return [
            'id' => $item->inventory_id,
            'name' => $item->ingredient->ingredient_name ?? '',
            'quantity' => (float) $item->input_quantity,
            'unit' => $item->input_unit,
            'expiryDate' => $item->expiration_date?->format('Y-m-d'),
            'category' => $item->ingredient->category->category_name ?? 'Other',
            'minimumThreshold' => $item->minimum_threshold ? (float) $item->minimum_threshold : null,
            'imageUrl' => $item->image_url,
            'userId' => $item->user_id,
            'createdAt' => $item->created_at?->toISOString(),
            'updatedAt' => $item->updated_at?->toISOString(),
        ];
    }
}
