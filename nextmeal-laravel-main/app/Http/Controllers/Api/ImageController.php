<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use App\Models\Inventory;
use App\Models\Ingredient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageController extends Controller
{
    /**
     * Upload image for a recipe
     */
    public function uploadRecipeImage(Request $request, Recipe $recipe): JsonResponse
    {
        $user = $request->user();

        // Check permission
        if (!$user->canEditRecipe($recipe)) {
            return response()->json(['message' => 'You do not have permission to edit this recipe'], 403);
        }

        $validated = $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'], // 5MB max
        ]);

        // Delete old image if exists
        if ($recipe->image_url) {
            $this->deleteOldImage($recipe->image_url);
        }

        // Store new image to public disk
        $file = $validated['image'];
        $fileName = 'recipes/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
        Storage::disk('public')->putFileAs('', $file, $fileName);

        // Update recipe with new image URL
        $imageUrl = '/storage/' . $fileName;
        $recipe->update(['image_url' => $imageUrl]);

        return response()->json([
            'data' => [
                'image_url' => $imageUrl,
            ],
            'message' => 'Image uploaded successfully',
        ]);
    }

    /**
     * Remove image from a recipe
     */
    public function removeRecipeImage(Request $request, Recipe $recipe): JsonResponse
    {
        $user = $request->user();

        // Check permission
        if (!$user->canEditRecipe($recipe)) {
            return response()->json(['message' => 'You do not have permission to edit this recipe'], 403);
        }

        if ($recipe->image_url) {
            $this->deleteOldImage($recipe->image_url);
            $recipe->update(['image_url' => null]);
        }

        return response()->json([
            'message' => 'Image removed successfully',
        ]);
    }

    /**
     * Upload image for an inventory item
     */
    public function uploadInventoryImage(Request $request, Inventory $inventory): JsonResponse
    {
        $user = $request->user();

        // Ensure user owns this inventory item
        if ($inventory->user_id !== $user->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'], // 5MB max
        ]);

        // Delete old image if exists
        if ($inventory->image_url) {
            $this->deleteOldImage($inventory->image_url);
        }

        // Store new image to public disk
        $file = $validated['image'];
        $fileName = 'inventory/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
        Storage::disk('public')->putFileAs('', $file, $fileName);

        // Update inventory with new image URL
        $imageUrl = '/storage/' . $fileName;
        $inventory->update(['image_url' => $imageUrl]);

        return response()->json([
            'data' => [
                'image_url' => $imageUrl,
            ],
            'message' => 'Image uploaded successfully',
        ]);
    }

    /**
     * Remove image from an inventory item
     */
    public function removeInventoryImage(Request $request, Inventory $inventory): JsonResponse
    {
        $user = $request->user();

        // Ensure user owns this inventory item
        if ($inventory->user_id !== $user->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        if ($inventory->image_url) {
            $this->deleteOldImage($inventory->image_url);
            $inventory->update(['image_url' => null]);
        }

        return response()->json([
            'message' => 'Image removed successfully',
        ]);
    }

    /**
     * Upload image for an ingredient (admin only)
     */
    public function uploadIngredientImage(Request $request, Ingredient $ingredient): JsonResponse
    {
        $user = $request->user();

        // Check if user is admin
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $validated = $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'], // 5MB max
        ]);

        // Delete old image if exists
        if ($ingredient->image_url) {
            $this->deleteOldImage($ingredient->image_url);
        }

        // Store new image to public disk
        $file = $validated['image'];
        $fileName = 'ingredients/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
        Storage::disk('public')->putFileAs('', $file, $fileName);

        // Update ingredient with new image URL
        $imageUrl = '/storage/' . $fileName;
        $ingredient->update(['image_url' => $imageUrl]);

        return response()->json([
            'data' => [
                'image_url' => $imageUrl,
            ],
            'message' => 'Image uploaded successfully',
        ]);
    }

    /**
     * Remove image from an ingredient (admin only)
     */
    public function removeIngredientImage(Request $request, Ingredient $ingredient): JsonResponse
    {
        $user = $request->user();

        // Check if user is admin
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        if ($ingredient->image_url) {
            $this->deleteOldImage($ingredient->image_url);
            $ingredient->update(['image_url' => null]);
        }

        return response()->json([
            'message' => 'Image removed successfully',
        ]);
    }

    /**
     * Generic image upload (returns URL for use anywhere)
     */
    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'], // 5MB max
            'type' => ['required', 'string', 'in:recipe,inventory,general,ingredients'],
        ]);

        $file = $validated['image'];
        $type = $validated['type'];
        $fileName = $type . '/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
        Storage::disk('public')->putFileAs('', $file, $fileName);

        $imageUrl = '/storage/' . $fileName;

        return response()->json([
            'data' => [
                'image_url' => $imageUrl,
                'full_url' => url($imageUrl),
            ],
            'message' => 'Image uploaded successfully',
        ]);
    }

    /**
     * Delete old image from storage
     */
    private function deleteOldImage(?string $imageUrl): void
    {
        if (!$imageUrl) {
            return;
        }

        // Extract path from URL (remove /storage/ prefix)
        $path = str_replace('/storage/', '', $imageUrl);
        
        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
