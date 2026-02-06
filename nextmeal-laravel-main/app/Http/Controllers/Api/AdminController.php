<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Recipe;
use App\Models\RecipeIngredient;
use App\Models\Ingredient;
use App\Models\Inventory;
use App\Models\ShoppingList;
use App\Models\Notification;
use App\Models\Category;
use App\Models\Unit;
use App\Models\IngredientBaseUnit;
use App\Models\Cuisine;
use App\Models\RecipeCategory;
use App\Models\CookingMethod;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    /**
     * Check if user is admin
     */
    private function checkAdmin(Request $request): void
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            abort(403, 'Unauthorized. Admin access required.');
        }
    }

    // ==================== DASHBOARD STATISTICS ====================
    
    /**
     * Get dashboard statistics
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $stats = [
            'users' => [
                'total' => User::where('role', '!=', User::ROLE_SYSTEM)->count(),
                'admins' => User::where('role', User::ROLE_ADMIN)->count(),
                'regular_users' => User::where('role', User::ROLE_USER)->count(),
                'new_today' => User::whereDate('created_at', today())->where('role', '!=', User::ROLE_SYSTEM)->count(),
            ],
            'recipes' => [
                'total' => Recipe::count(),
                'system_recipes' => Recipe::where('owner_user_id', User::SYSTEM_USER_ID)->count(),
                'user_recipes' => Recipe::where('owner_user_id', '!=', User::SYSTEM_USER_ID)->count(),
                'new_today' => Recipe::whereDate('created_at', today())->count(),
            ],
            'ingredients' => [
                'total' => Ingredient::count(),
                'in_use' => Inventory::distinct('ingredient_id')->count(),
            ],
            'inventory' => [
                'total_items' => Inventory::count(),
                'low_stock_items' => Inventory::whereRaw('input_quantity <= COALESCE(minimum_threshold, 2)')->count(),
            ],
            'shopping_lists' => [
                'total_items' => ShoppingList::count(),
                'checked_items' => ShoppingList::where('is_checked', true)->count(),
            ],
            'notifications' => [
                'total' => Notification::count(),
                'unread' => Notification::where('is_read', false)->count(),
                'active' => Notification::where('is_active', true)->count(),
            ],
        ];
        
        return response()->json(['data' => $stats]);
    }

    // ==================== USERS MANAGEMENT ====================
    
    /**
     * Get all users (paginated)
     */
    public function getUsers(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $perPage = $request->get('per_page', 15);
        $page = $request->get('page', 1);
        $search = $request->get('search');
        $role = $request->get('role');
        
        $query = User::query()->where('role', '!=', User::ROLE_SYSTEM);
        
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        if ($role) {
            $query->where('role', $role);
        }
        
        $users = $query->orderBy('created_at', 'desc')
                      ->paginate($perPage, ['*'], 'page', $page);
        
        $formattedUsers = $users->map(function ($user) {
            return [
                'id' => $user->user_id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'notifications_enabled' => $user->notifications_enabled,
                'created_at' => $user->created_at?->toISOString(),
                'updated_at' => $user->updated_at?->toISOString(),
            ];
        });
        
        return response()->json([
            'data' => $formattedUsers,
            'meta' => [
                'currentPage' => $users->currentPage(),
                'lastPage' => $users->lastPage(),
                'perPage' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }
    
    /**
     * Get single user with statistics
     */
    public function getUser(Request $request, string $userId): JsonResponse
    {
        $this->checkAdmin($request);
        
        $user = User::findOrFail($userId);
        
        // Get user statistics
        $stats = [
            'recipes_count' => $user->recipes()->count(),
            'inventory_count' => $user->inventory()->count(),
            'shopping_list_count' => $user->shoppingList()->count(),
            'favorites_count' => $user->favorites()->count(),
            'notifications_count' => $user->notifications()->count(),
        ];
        
        return response()->json([
            'data' => [
                'id' => $user->user_id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'notifications_enabled' => $user->notifications_enabled,
                'created_at' => $user->created_at?->toISOString(),
                'updated_at' => $user->updated_at?->toISOString(),
                'stats' => $stats,
            ],
        ]);
    }
    
    /**
     * Update user role
     */
    public function updateUserRole(Request $request, string $userId): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(['admin', 'user'])],
        ]);
        
        $user = User::findOrFail($userId);
        
        // Prevent changing system user role
        if ($user->isSystem()) {
            return response()->json(['message' => 'Cannot modify system user'], 403);
        }
        
        // Prevent removing last admin
        if ($user->isAdmin() && $validated['role'] === 'user') {
            $adminCount = User::where('role', User::ROLE_ADMIN)->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'Cannot remove last admin'], 403);
            }
        }
        
        $user->role = $validated['role'];
        $user->save();
        
        return response()->json([
            'data' => [
                'id' => $user->user_id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'message' => 'User role updated successfully',
        ]);
    }
    
    /**
     * Update user
     */
    public function updateUser(Request $request, string $userId): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId, 'user_id')],
            'notifications_enabled' => ['sometimes', 'boolean'],
        ]);
        
        $user = User::findOrFail($userId);
        
        if ($user->isSystem()) {
            return response()->json(['message' => 'Cannot modify system user'], 403);
        }
        
        $user->fill($validated);
        $user->save();
        
        return response()->json([
            'data' => [
                'id' => $user->user_id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'notifications_enabled' => $user->notifications_enabled,
            ],
            'message' => 'User updated successfully',
        ]);
    }
    
    /**
     * Delete user
     */
    public function deleteUser(Request $request, string $userId): JsonResponse
    {
        $this->checkAdmin($request);
        
        $user = User::findOrFail($userId);
        
        // Prevent deleting system user
        if ($user->isSystem()) {
            return response()->json(['message' => 'Cannot delete system user'], 403);
        }
        
        // Prevent deleting yourself
        if ($user->user_id === $request->user()->user_id) {
            return response()->json(['message' => 'Cannot delete yourself'], 403);
        }
        
        // Prevent deleting last admin
        if ($user->isAdmin()) {
            $adminCount = User::where('role', User::ROLE_ADMIN)->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'Cannot delete last admin'], 403);
            }
        }
        
        $user->delete();
        
        return response()->json(['message' => 'User deleted successfully']);
    }
    
    // ==================== RECIPES MANAGEMENT ====================
    
    /**
     * Get all recipes (admin can see all)
     */
    public function getAllRecipes(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $perPage = $request->get('per_page', 15);
        $page = $request->get('page', 1);
        $search = $request->get('search');
        $ownerId = $request->get('owner_id');
        
        $query = Recipe::with(['recipeIngredients.ingredient', 'recipeIngredients.unit', 'recipeSteps', 'cuisine', 'recipeCategory', 'cookingMethod', 'owner']);
        
        if ($search) {
            $query->where('recipe_name', 'like', "%{$search}%");
        }
        
        if ($ownerId) {
            $query->where('owner_user_id', $ownerId);
        }
        
        $recipes = $query->orderBy('created_at', 'desc')->paginate($perPage, ['*'], 'page', $page);
        
        $formattedRecipes = $recipes->map(function ($recipe) {
            return $this->formatRecipe($recipe);
        });
        
        return response()->json([
            'data' => $formattedRecipes,
            'meta' => [
                'currentPage' => $recipes->currentPage(),
                'lastPage' => $recipes->lastPage(),
                'perPage' => $recipes->perPage(),
                'total' => $recipes->total(),
            ],
        ]);
    }
    
    /**
     * Update recipe (admin only)
     */
    public function updateRecipe(Request $request, Recipe $recipe): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'prep_time' => ['sometimes', 'string', 'max:50'],
            'servings' => ['sometimes', 'integer', 'min:1'],
            'required_ingredients' => ['sometimes', 'array', 'min:1'],
            'required_ingredients.*' => ['string'],
            'ingredient_details' => ['nullable', 'array'],
            'instructions' => ['sometimes', 'array', 'min:1'],
            'instructions.*' => ['string'],
            'image_url' => ['nullable', 'url', 'max:500'],
            'cuisine_id' => ['nullable', 'string', 'exists:cuisines,cuisine_id'],
            'recipe_category_id' => ['nullable', 'string', 'exists:recipe_categories,recipe_category_id'],
            'method_id' => ['nullable', 'string', 'exists:cooking_methods,method_id'],
        ]);

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
        if (array_key_exists('recipe_category_id', $validated)) {
            $updateData['recipe_category_id'] = $validated['recipe_category_id'];
        }
        if (array_key_exists('method_id', $validated)) {
            $updateData['method_id'] = $validated['method_id'];
        }

        $recipe->update($updateData);

        // Update recipe ingredients if provided
        if (isset($validated['required_ingredients'])) {
            // Remove existing ingredients
            $recipe->recipeIngredients()->delete();

            // Add new ingredients
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

        $recipe->load(['recipeIngredients.ingredient', 'recipeIngredients.unit', 'recipeSteps', 'cuisine', 'recipeCategory', 'cookingMethod', 'owner']);

        return response()->json([
            'data' => $this->formatRecipe($recipe),
            'message' => 'Recipe updated successfully',
        ]);
    }
    
    /**
     * Delete any recipe (admin only)
     */
    public function deleteRecipe(Request $request, Recipe $recipe): JsonResponse
    {
        $this->checkAdmin($request);
        
        $recipe->recipeIngredients()->delete();
        $recipe->favorites()->delete();
        $recipe->delete();
        
        return response()->json(['message' => 'Recipe deleted successfully']);
    }
    
    // ==================== INGREDIENTS MANAGEMENT ====================
    
    /**
     * Get all ingredients
     */
    public function getAllIngredients(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $perPage = $request->get('per_page', 15);
        $page = $request->get('page', 1);
        $search = $request->get('search');
        $categoryId = $request->get('category_id');
        
        $query = Ingredient::with(['category', 'baseUnit']);
        
        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }
        
        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }
        
        $ingredients = $query->orderBy('name', 'asc')->paginate($perPage, ['*'], 'page', $page);
        
        $formattedIngredients = $ingredients->map(function ($ingredient) {
            return [
                'id' => $ingredient->ingredient_id,
                'name' => $ingredient->name,
                'category' => $ingredient->category ? [
                    'id' => $ingredient->category->category_id,
                    'name' => $ingredient->category->name,
                ] : null,
                'base_unit' => $ingredient->base_unit_code,
                'image_url' => $ingredient->image_url,
                'in_recipes_count' => $ingredient->recipeIngredients()->count(),
                'in_inventory_count' => $ingredient->inventoryItems()->count(),
                'created_at' => $ingredient->created_at?->toISOString(),
            ];
        });
        
        return response()->json([
            'data' => $formattedIngredients,
            'meta' => [
                'currentPage' => $ingredients->currentPage(),
                'lastPage' => $ingredients->lastPage(),
                'perPage' => $ingredients->perPage(),
                'total' => $ingredients->total(),
            ],
        ]);
    }
    
    /**
     * Create ingredient
     */
    public function createIngredient(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:ingredients,name'],
            'category_id' => ['nullable', 'exists:categories,category_id'],
            'base_unit' => ['nullable', 'string', 'exists:units,unit_code'],
        ]);
        
        $ingredient = Ingredient::create([
            'name' => $validated['name'],
            'category_id' => $validated['category_id'] ?? null,
        ]);
        
        // Set base unit if provided
        if (isset($validated['base_unit'])) {
            IngredientBaseUnit::updateOrCreate(
                ['ingredient_id' => $ingredient->ingredient_id],
                ['base_unit' => $validated['base_unit']]
            );
        }
        
        $ingredient->load(['category', 'baseUnit']);
        
        return response()->json([
            'data' => [
                'id' => $ingredient->ingredient_id,
                'name' => $ingredient->name,
                'category_id' => $ingredient->category_id,
                'base_unit' => $ingredient->base_unit_code,
                'image_url' => $ingredient->image_url,
            ],
            'message' => 'Ingredient created successfully',
        ], 201);
    }
    
    /**
     * Update ingredient
     */
    public function updateIngredient(Request $request, Ingredient $ingredient): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('ingredients', 'name')->ignore($ingredient->ingredient_id, 'ingredient_id')],
            'category_id' => ['nullable', 'exists:categories,category_id'],
            'base_unit' => ['nullable', 'string', 'exists:units,unit_code'],
        ]);
        
        if (isset($validated['name']) || isset($validated['category_id'])) {
            $ingredient->fill([
                'name' => $validated['name'] ?? $ingredient->name,
                'category_id' => $validated['category_id'] ?? $ingredient->category_id,
            ]);
            $ingredient->save();
        }
        
        // Update base unit if provided
        if (isset($validated['base_unit'])) {
            IngredientBaseUnit::updateOrCreate(
                ['ingredient_id' => $ingredient->ingredient_id],
                ['base_unit' => $validated['base_unit']]
            );
        }
        
        $ingredient->load(['category', 'baseUnit']);
        
        return response()->json([
            'data' => [
                'id' => $ingredient->ingredient_id,
                'name' => $ingredient->name,
                'category_id' => $ingredient->category_id,
                'base_unit' => $ingredient->base_unit_code,
                'image_url' => $ingredient->image_url,
            ],
            'message' => 'Ingredient updated successfully',
        ]);
    }
    
    /**
     * Delete ingredient
     */
    public function deleteIngredient(Request $request, Ingredient $ingredient): JsonResponse
    {
        $this->checkAdmin($request);
        
        // Check if ingredient is in use
        $inRecipes = $ingredient->recipeIngredients()->count() > 0;
        $inInventory = $ingredient->inventoryItems()->count() > 0;
        
        if ($inRecipes || $inInventory) {
            return response()->json([
                'message' => 'Cannot delete ingredient that is in use',
                'in_recipes' => $inRecipes,
                'in_inventory' => $inInventory,
            ], 400);
        }
        
        $ingredient->delete();
        
        return response()->json(['message' => 'Ingredient deleted successfully']);
    }
    
    /**
     * Get ingredient usage details (recipes and inventory users)
     */
    public function getIngredientUsage(Request $request, Ingredient $ingredient): JsonResponse
    {
        $this->checkAdmin($request);
        
        // Get recipes that use this ingredient
        $recipeIngredients = $ingredient->recipeIngredients()
            ->with(['recipe.owner'])
            ->get();
        
        $recipes = $recipeIngredients->map(function ($ri) {
            return [
                'id' => $ri->recipe->recipe_id,
                'name' => $ri->recipe->recipe_name,
                'quantity' => $ri->required_quantity,
                'unit' => $ri->required_unit,
                'owner' => $ri->recipe->owner ? [
                    'id' => $ri->recipe->owner->user_id,
                    'name' => $ri->recipe->owner->name,
                ] : null,
            ];
        });
        
        // Get inventory items with this ingredient
        $inventoryItems = $ingredient->inventoryItems()
            ->with('user')
            ->get();
        
        $inventory = $inventoryItems->map(function ($item) {
            return [
                'id' => $item->inventory_id,
                'user' => [
                    'id' => $item->user->user_id,
                    'name' => $item->user->name,
                    'email' => $item->user->email,
                ],
                'quantity' => $item->input_quantity,
                'unit' => $item->input_unit,
                'expiry_date' => $item->expiry_date,
            ];
        });
        
        return response()->json([
            'data' => [
                'ingredient' => [
                    'id' => $ingredient->ingredient_id,
                    'name' => $ingredient->name,
                ],
                'recipes' => $recipes,
                'inventory' => $inventory,
                'counts' => [
                    'recipes' => $recipes->count(),
                    'inventory' => $inventory->count(),
                ],
            ],
        ]);
    }
    
    /**
     * Get allowed units for a specific ingredient (including base unit) plus all available units
     */
    public function getIngredientAllowedUnits(Request $request, Ingredient $ingredient): JsonResponse
    {
        $this->checkAdmin($request);

        $ingredient->load(['allowedUnits', 'baseUnit']);

        $allowedUnits = $ingredient->allowedUnits->pluck('unit_code')->all();
        $baseUnit = $ingredient->base_unit_code;

        if ($baseUnit && !in_array($baseUnit, $allowedUnits, true)) {
            $allowedUnits[] = $baseUnit;
        }

        $allowedUnits = array_values(array_unique($allowedUnits));

        $allUnits = Unit::orderBy('unit_code', 'asc')->get()->map(function ($unit) {
            return [
                'code' => $unit->unit_code,
                'name' => $unit->unit_code,
                'kind' => $unit->unit_kind ?? null,
                'base_unit' => $unit->base_unit ?? null,
                'to_base_factor' => $unit->to_base_factor ? (float) $unit->to_base_factor : null,
            ];
        })->values();

        return response()->json([
            'data' => [
                'ingredient_id' => $ingredient->ingredient_id,
                'name' => $ingredient->name,
                'base_unit' => $baseUnit,
                'allowed_units' => $allowedUnits,
                'all_units' => $allUnits,
            ],
        ]);
    }
    
    /**
     * Add an allowed unit for an ingredient
     */
    public function addIngredientAllowedUnit(Request $request, Ingredient $ingredient): JsonResponse
    {
        $this->checkAdmin($request);

        $validated = $request->validate([
            'unit_code' => ['required', 'string', 'exists:units,unit_code'],
        ]);

        $unitCode = $validated['unit_code'];

        // Attach the unit to ingredient_allowed_units (no duplicates)
        $ingredient->allowedUnits()->syncWithoutDetaching([$unitCode]);

        // Return updated allowed units data
        return $this->getIngredientAllowedUnits($request, $ingredient);
    }

    /**
     * Remove an allowed unit from an ingredient
     */
    public function removeIngredientAllowedUnit(Request $request, Ingredient $ingredient, string $unit): JsonResponse
    {
        $this->checkAdmin($request);

        // Detach from pivot; base unit remains implicitly allowed via base_unit_code
        $ingredient->allowedUnits()->detach($unit);

        // Return updated allowed units data
        return $this->getIngredientAllowedUnits($request, $ingredient);
    }
    
    // ==================== CATEGORIES MANAGEMENT ====================
    
    /**
     * Get all categories
     */
    public function getAllCategories(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $categories = Category::orderBy('name', 'asc')->get();
        
        return response()->json([
            'data' => $categories->map(function ($category) {
                return [
                    'id' => $category->category_id,
                    'name' => $category->name,
                    'ingredients_count' => $category->ingredients()->count(),
                ];
            }),
        ]);
    }
    
    /**
     * Create category
     */
    public function createCategory(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
        ]);
        
        $category = Category::create([
            'name' => $validated['name'],
        ]);
        
        return response()->json([
            'data' => [
                'id' => $category->category_id,
                'name' => $category->name,
            ],
            'message' => 'Category created successfully',
        ], 201);
    }
    
    /**
     * Update category
     */
    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('categories', 'name')->ignore($category->category_id, 'category_id')],
        ]);
        
        $category->name = $validated['name'];
        $category->save();
        
        return response()->json([
            'data' => [
                'id' => $category->category_id,
                'name' => $category->name,
            ],
            'message' => 'Category updated successfully',
        ]);
    }
    
    /**
     * Delete category
     */
    public function deleteCategory(Request $request, Category $category): JsonResponse
    {
        $this->checkAdmin($request);
        
        // Check if category is in use
        $inUse = $category->ingredients()->count() > 0;
        
        if ($inUse) {
            return response()->json([
                'message' => 'Cannot delete category that is in use',
            ], 400);
        }
        
        $category->delete();
        
        return response()->json(['message' => 'Category deleted successfully']);
    }
    
    // ==================== UNITS MANAGEMENT ====================
    
    /**
     * Get all units
     */
    public function getAllUnits(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $units = Unit::orderBy('unit_code', 'asc')->get();
        
        return response()->json([
            'data' => $units->map(function ($unit) {
                return [
                    'code' => $unit->unit_code,
                    'name' => $unit->unit_code, // Use unit_code as name since name column doesn't exist
                    'kind' => $unit->unit_kind ?? null,
                    'base_unit' => $unit->base_unit ?? null,
                    'to_base_factor' => $unit->to_base_factor ? (float) $unit->to_base_factor : null,
                ];
            }),
        ]);
    }
    
    /**
     * Create unit
     */
    public function createUnit(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'unit_code' => ['required', 'string', 'max:20', 'unique:units,unit_code'],
            'unit_kind' => ['nullable', 'string', 'max:30'],
            'base_unit' => ['nullable', 'string', 'max:20'],
            'to_base_factor' => ['nullable', 'numeric'],
        ]);
        
        $unit = Unit::create($validated);
        
        return response()->json([
            'data' => [
                'code' => $unit->unit_code,
                'name' => $unit->unit_code,
                'kind' => $unit->unit_kind,
                'base_unit' => $unit->base_unit,
                'to_base_factor' => $unit->to_base_factor ? (float) $unit->to_base_factor : null,
            ],
            'message' => 'Unit created successfully',
        ], 201);
    }
    
    /**
     * Update unit
     */
    public function updateUnit(Request $request, Unit $unit): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'unit_kind' => ['sometimes', 'string', 'max:30'],
            'base_unit' => ['sometimes', 'string', 'max:20'],
            'to_base_factor' => ['sometimes', 'numeric'],
        ]);
        
        $unit->fill($validated);
        $unit->save();
        
        return response()->json([
            'data' => [
                'code' => $unit->unit_code,
                'name' => $unit->unit_code,
                'kind' => $unit->unit_kind,
                'base_unit' => $unit->base_unit,
                'to_base_factor' => $unit->to_base_factor ? (float) $unit->to_base_factor : null,
            ],
            'message' => 'Unit updated successfully',
        ]);
    }
    
    /**
     * Delete unit
     */
    public function deleteUnit(Request $request, Unit $unit): JsonResponse
    {
        $this->checkAdmin($request);
        
        // Check if unit is in use (in ingredient_base_unit, inventory, etc.)
        $inUse = IngredientBaseUnit::where('base_unit', $unit->unit_code)->count() > 0;
        
        if ($inUse) {
            return response()->json([
                'message' => 'Cannot delete unit that is in use',
            ], 400);
        }
        
        $unit->delete();
        
        return response()->json(['message' => 'Unit deleted successfully']);
    }
    
    // ==================== CUISINES MANAGEMENT ====================
    
    /**
     * Get all cuisines
     */
    public function getAllCuisines(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $cuisines = Cuisine::orderBy('name', 'asc')->get();
        
        return response()->json([
            'data' => $cuisines->map(function ($cuisine) {
                return [
                    'id' => $cuisine->cuisine_id,
                    'name' => $cuisine->name,
                    'recipes_count' => $cuisine->recipes()->count(),
                ];
            }),
        ]);
    }
    
    /**
     * Create cuisine
     */
    public function createCuisine(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:cuisines,name'],
        ]);
        
        $cuisine = Cuisine::create([
            'name' => $validated['name'],
        ]);
        
        return response()->json([
            'data' => [
                'id' => $cuisine->cuisine_id,
                'name' => $cuisine->name,
            ],
            'message' => 'Cuisine created successfully',
        ], 201);
    }
    
    /**
     * Update cuisine
     */
    public function updateCuisine(Request $request, Cuisine $cuisine): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('cuisines', 'name')->ignore($cuisine->cuisine_id, 'cuisine_id')],
        ]);
        
        $cuisine->name = $validated['name'];
        $cuisine->save();
        
        return response()->json([
            'data' => [
                'id' => $cuisine->cuisine_id,
                'name' => $cuisine->name,
            ],
            'message' => 'Cuisine updated successfully',
        ]);
    }
    
    /**
     * Delete cuisine
     */
    public function deleteCuisine(Request $request, Cuisine $cuisine): JsonResponse
    {
        $this->checkAdmin($request);
        
        // Check if cuisine is in use
        $inUse = $cuisine->recipes()->count() > 0;
        
        if ($inUse) {
            return response()->json([
                'message' => 'Cannot delete cuisine that is in use',
            ], 400);
        }
        
        $cuisine->delete();
        
        return response()->json(['message' => 'Cuisine deleted successfully']);
    }
    
    // ==================== RECIPE CATEGORIES MANAGEMENT ====================
    
    /**
     * Get all recipe categories
     */
    public function getAllRecipeCategories(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $categories = RecipeCategory::orderBy('name', 'asc')->get();
        
        return response()->json([
            'data' => $categories->map(function ($category) {
                return [
                    'id' => $category->recipe_category_id,
                    'name' => $category->name,
                    'recipes_count' => $category->recipes()->count(),
                ];
            }),
        ]);
    }
    
    /**
     * Create recipe category
     */
    public function createRecipeCategory(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:recipe_categories,name'],
        ]);
        
        $category = RecipeCategory::create([
            'name' => $validated['name'],
        ]);
        
        return response()->json([
            'data' => [
                'id' => $category->recipe_category_id,
                'name' => $category->name,
            ],
            'message' => 'Recipe category created successfully',
        ], 201);
    }
    
    /**
     * Update recipe category
     */
    public function updateRecipeCategory(Request $request, RecipeCategory $recipeCategory): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('recipe_categories', 'name')->ignore($recipeCategory->recipe_category_id, 'recipe_category_id')],
        ]);
        
        $recipeCategory->name = $validated['name'];
        $recipeCategory->save();
        
        return response()->json([
            'data' => [
                'id' => $recipeCategory->recipe_category_id,
                'name' => $recipeCategory->name,
            ],
            'message' => 'Recipe category updated successfully',
        ]);
    }
    
    /**
     * Delete recipe category
     */
    public function deleteRecipeCategory(Request $request, RecipeCategory $recipeCategory): JsonResponse
    {
        $this->checkAdmin($request);
        
        // Check if category is in use
        $inUse = $recipeCategory->recipes()->count() > 0;
        
        if ($inUse) {
            return response()->json([
                'message' => 'Cannot delete recipe category that is in use',
            ], 400);
        }
        
        $recipeCategory->delete();
        
        return response()->json(['message' => 'Recipe category deleted successfully']);
    }
    
    // ==================== COOKING METHODS MANAGEMENT ====================
    
    /**
     * Get all cooking methods
     */
    public function getAllCookingMethods(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $methods = CookingMethod::orderBy('name', 'asc')->get();
        
        return response()->json([
            'data' => $methods->map(function ($method) {
                return [
                    'id' => $method->method_id,
                    'name' => $method->name,
                    'recipes_count' => $method->recipes()->count(),
                ];
            }),
        ]);
    }
    
    /**
     * Create cooking method
     */
    public function createCookingMethod(Request $request): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:cooking_methods,name'],
        ]);
        
        $method = CookingMethod::create([
            'name' => $validated['name'],
        ]);
        
        return response()->json([
            'data' => [
                'id' => $method->method_id,
                'name' => $method->name,
            ],
            'message' => 'Cooking method created successfully',
        ], 201);
    }
    
    /**
     * Update cooking method
     */
    public function updateCookingMethod(Request $request, CookingMethod $cookingMethod): JsonResponse
    {
        $this->checkAdmin($request);
        
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('cooking_methods', 'name')->ignore($cookingMethod->method_id, 'method_id')],
        ]);
        
        $cookingMethod->name = $validated['name'];
        $cookingMethod->save();
        
        return response()->json([
            'data' => [
                'id' => $cookingMethod->method_id,
                'name' => $cookingMethod->name,
            ],
            'message' => 'Cooking method updated successfully',
        ]);
    }
    
    /**
     * Delete cooking method
     */
    public function deleteCookingMethod(Request $request, CookingMethod $cookingMethod): JsonResponse
    {
        $this->checkAdmin($request);
        
        // Check if method is in use
        $inUse = $cookingMethod->recipes()->count() > 0;
        
        if ($inUse) {
            return response()->json([
                'message' => 'Cannot delete cooking method that is in use',
            ], 400);
        }
        
        $cookingMethod->delete();
        
        return response()->json(['message' => 'Cooking method deleted successfully']);
    }
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Format recipe for API response
     */
    private function formatRecipe(Recipe $recipe): array
    {
        $instructions = $recipe->relationLoaded('recipeSteps') && $recipe->recipeSteps->isNotEmpty()
            ? $recipe->recipeSteps->pluck('description')->values()->all()
            : ($recipe->instructions ?? []);

        return [
            'id' => $recipe->recipe_id,
            'name' => $recipe->recipe_name,
            'description' => $recipe->description ?? '',
            'prepTime' => $recipe->prep_time ?? '',
            'servings' => $recipe->servings ?? 1,
            'cuisine' => $recipe->cuisine?->name ?? null,
            'recipeCategory' => $recipe->recipeCategory?->name ?? null,
            'cookingMethod' => $recipe->cookingMethod?->name ?? null,
            'requiredIngredients' => $recipe->required_ingredients,
            'ingredientDetails' => $recipe->ingredient_details,
            'instructions' => $instructions,
            'imageUrl' => $recipe->image_url,
            'ownerUserId' => $recipe->owner_user_id ?? User::SYSTEM_USER_ID,
            'ownerName' => $recipe->owner ? $recipe->owner->name : 'System',
            'createdAt' => $recipe->created_at?->toISOString(),
            'updatedAt' => $recipe->updated_at?->toISOString(),
        ];
    }
}
