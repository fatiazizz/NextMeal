<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Recipe extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'recipes';
    protected $primaryKey = 'recipe_id';

    protected $fillable = [
        'owner_user_id',
        'recipe_name',
        'description',
        'instructions',
        'prep_time',
        'servings',
        'image_url',
        'cuisine_id',
        'recipe_category_id',
        'method_id',
    ];

    protected $casts = [
        'instructions' => 'array',
        'servings' => 'integer',
    ];

    /**
     * Check if this is a system recipe
     */
    public function isSystemRecipe(): bool
    {
        return $this->owner_user_id === User::SYSTEM_USER_ID;
    }

    // Relationships
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id', 'user_id');
    }

    public function cuisine(): BelongsTo
    {
        return $this->belongsTo(Cuisine::class, 'cuisine_id', 'cuisine_id');
    }

    public function recipeCategory(): BelongsTo
    {
        return $this->belongsTo(RecipeCategory::class, 'recipe_category_id', 'recipe_category_id');
    }

    public function cookingMethod(): BelongsTo
    {
        return $this->belongsTo(CookingMethod::class, 'method_id', 'method_id');
    }

    public function recipeIngredients(): HasMany
    {
        return $this->hasMany(RecipeIngredient::class, 'recipe_id', 'recipe_id');
    }

    public function recipeSteps(): HasMany
    {
        return $this->hasMany(RecipeStep::class, 'recipe_id', 'recipe_id')->orderBy('step_number');
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class, 'recipe_id', 'recipe_id');
    }

    public function getRouteKeyName(): string
    {
        return 'recipe_id';
    }

    /**
     * Get required ingredients as array of names
     */
    public function getRequiredIngredientsAttribute(): array
    {
        return $this->recipeIngredients()
            ->with('ingredient')
            ->get()
            ->pluck('ingredient.ingredient_name')
            ->filter()
            ->values()
            ->toArray();
    }

    /**
     * Get ingredient details
     */
    public function getIngredientDetailsAttribute(): array
    {
        return $this->recipeIngredients()
            ->with(['ingredient', 'unit'])
            ->get()
            ->map(function ($ri) {
                return [
                    'ingredient' => $ri->ingredient->ingredient_name ?? '',
                    'quantity' => (float) $ri->required_quantity,
                    'unit' => $ri->required_unit ?? '',
                ];
            })
            ->toArray();
    }
}
