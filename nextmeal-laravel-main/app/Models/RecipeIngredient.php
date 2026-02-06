<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;


class RecipeIngredient extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'recipe_ingredients';
    protected $primaryKey = 'recipe_ingredient_id';

    protected $fillable = [
        'recipe_id',
        'ingredient_id',
        'required_quantity',
        'required_unit',
    ];

    protected $casts = [
        'required_quantity' => 'decimal:3',
    ];

    // Accessor for quantity (alias)
    public function getQuantityAttribute()
    {
        return $this->required_quantity;
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class, 'recipe_id', 'recipe_id');
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'ingredient_id', 'ingredient_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'required_unit', 'unit_code');
    }

    public function getRouteKeyName(): string
    {
        return 'recipe_ingredient_id';
    }
}
