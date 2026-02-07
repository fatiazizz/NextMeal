<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\IngredientController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\RecipeController;
use App\Http\Controllers\Api\ShoppingListController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RecommendationController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ImageController;
use App\Http\Controllers\Api\ReferenceDataController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\NewPasswordController;

// Public authentication routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordResetLinkController::class, 'store']);
Route::post('/reset-password', [NewPasswordController::class, 'store']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Ingredients (system ingredients)
    Route::get('/ingredients', [IngredientController::class, 'index']);
    Route::get('/ingredients/search', [IngredientController::class, 'search']);
    Route::get('/ingredients/{ingredient}', [IngredientController::class, 'show']);

    // Reference data for recipe form (cuisines, cooking methods)
    Route::get('/cuisines', [ReferenceDataController::class, 'cuisines']);
    Route::get('/cooking-methods', [ReferenceDataController::class, 'cookingMethods']);

    // Inventory
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::post('/inventory', [InventoryController::class, 'store']);
    Route::get('/inventory/{inventory}', [InventoryController::class, 'show']);
    Route::put('/inventory/{inventory}', [InventoryController::class, 'update']);
    Route::patch('/inventory/{inventory}', [InventoryController::class, 'update']);
    Route::delete('/inventory/{inventory}', [InventoryController::class, 'destroy']);
    Route::post('/inventory/{inventory}/image', [ImageController::class, 'uploadInventoryImage']);
    Route::delete('/inventory/{inventory}/image', [ImageController::class, 'removeInventoryImage']);

    // Recipes
    Route::get('/recipes', [RecipeController::class, 'index']);
    Route::post('/recipes', [RecipeController::class, 'store']);
    Route::get('/recipes/{recipe}', [RecipeController::class, 'show']);
    Route::get('/recipes/{recipe}/permissions', [RecipeController::class, 'permissions']);
    Route::put('/recipes/{recipe}', [RecipeController::class, 'update']);
    Route::patch('/recipes/{recipe}', [RecipeController::class, 'update']);
    Route::delete('/recipes/{recipe}', [RecipeController::class, 'destroy']);
    Route::post('/recipes/{recipe}/image', [ImageController::class, 'uploadRecipeImage']);
    Route::delete('/recipes/{recipe}/image', [ImageController::class, 'removeRecipeImage']);

    // General Image Upload
    Route::post('/upload-image', [ImageController::class, 'upload']);

    // Shopping List
    Route::get('/shopping-list', [ShoppingListController::class, 'index']);
    Route::post('/shopping-list', [ShoppingListController::class, 'store']);
    Route::put('/shopping-list/{shoppingList}', [ShoppingListController::class, 'update']);
    Route::patch('/shopping-list/{shoppingList}', [ShoppingListController::class, 'update']);
    Route::patch('/shopping-list/{shoppingList}/toggle', [ShoppingListController::class, 'toggleChecked']);
    Route::delete('/shopping-list/{shoppingList}', [ShoppingListController::class, 'destroy']);
    Route::delete('/shopping-list/clear-checked', [ShoppingListController::class, 'clearChecked']);

    // Favorites
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::get('/favorites/{recipeId}/check', [FavoriteController::class, 'check']);
    Route::delete('/favorites/{recipeId}', [FavoriteController::class, 'destroy']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

    // Recommendations (Meal Suggestion Engine)
    Route::get('/recommendations', [RecommendationController::class, 'index']);
    Route::post('/recommendations/{recipe}/use', [RecommendationController::class, 'useRecipe']);

    // Admin routes (admin only)
    Route::prefix('admin')->group(function () {
        // Dashboard statistics
        Route::get('/statistics', [AdminController::class, 'getStatistics']);
        
        // Users management
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::get('/users/{userId}', [AdminController::class, 'getUser']);
        Route::put('/users/{userId}', [AdminController::class, 'updateUser']);
        Route::put('/users/{userId}/role', [AdminController::class, 'updateUserRole']);
        Route::delete('/users/{userId}', [AdminController::class, 'deleteUser']);
        
        // Recipes management
        Route::get('/recipes', [AdminController::class, 'getAllRecipes']);
        Route::put('/recipes/{recipe}', [AdminController::class, 'updateRecipe']);
        Route::delete('/recipes/{recipe}', [AdminController::class, 'deleteRecipe']);
        
        // Cuisines management
        Route::get('/cuisines', [AdminController::class, 'getAllCuisines']);
        Route::post('/cuisines', [AdminController::class, 'createCuisine']);
        Route::put('/cuisines/{cuisine}', [AdminController::class, 'updateCuisine']);
        Route::delete('/cuisines/{cuisine}', [AdminController::class, 'deleteCuisine']);
        
        // Recipe Categories management
        Route::get('/recipe-categories', [AdminController::class, 'getAllRecipeCategories']);
        Route::post('/recipe-categories', [AdminController::class, 'createRecipeCategory']);
        Route::put('/recipe-categories/{recipeCategory}', [AdminController::class, 'updateRecipeCategory']);
        Route::delete('/recipe-categories/{recipeCategory}', [AdminController::class, 'deleteRecipeCategory']);
        
        // Cooking Methods management
        Route::get('/cooking-methods', [AdminController::class, 'getAllCookingMethods']);
        Route::post('/cooking-methods', [AdminController::class, 'createCookingMethod']);
        Route::put('/cooking-methods/{cookingMethod}', [AdminController::class, 'updateCookingMethod']);
        Route::delete('/cooking-methods/{cookingMethod}', [AdminController::class, 'deleteCookingMethod']);
        
        // Ingredients management
        Route::get('/ingredients', [AdminController::class, 'getAllIngredients']);
        Route::post('/ingredients', [AdminController::class, 'createIngredient']);
        Route::get('/ingredients/{ingredient}/usage', [AdminController::class, 'getIngredientUsage']);
        Route::put('/ingredients/{ingredient}', [AdminController::class, 'updateIngredient']);
        Route::delete('/ingredients/{ingredient}', [AdminController::class, 'deleteIngredient']);
        Route::post('/ingredients/{ingredient}/image', [ImageController::class, 'uploadIngredientImage']);
        Route::delete('/ingredients/{ingredient}/image', [ImageController::class, 'removeIngredientImage']);
        // Ingredient allowed units management
        Route::get('/ingredients/{ingredient}/allowed-units', [AdminController::class, 'getIngredientAllowedUnits']);
        Route::post('/ingredients/{ingredient}/allowed-units', [AdminController::class, 'addIngredientAllowedUnit']);
        Route::delete('/ingredients/{ingredient}/allowed-units/{unit}', [AdminController::class, 'removeIngredientAllowedUnit']);
        
        // Categories management
        Route::get('/categories', [AdminController::class, 'getAllCategories']);
        Route::post('/categories', [AdminController::class, 'createCategory']);
        Route::put('/categories/{category}', [AdminController::class, 'updateCategory']);
        Route::delete('/categories/{category}', [AdminController::class, 'deleteCategory']);
        
        // Units management
        Route::get('/units', [AdminController::class, 'getAllUnits']);
        Route::post('/units', [AdminController::class, 'createUnit']);
        Route::put('/units/{unit}', [AdminController::class, 'updateUnit']);
        Route::delete('/units/{unit}', [AdminController::class, 'deleteUnit']);
    });
});
