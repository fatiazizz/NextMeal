<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IngredientBaseUnit extends Model
{
    protected $table = 'ingredient_base_unit';
    protected $primaryKey = 'ingredient_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'ingredient_id',
        'base_unit',
    ];

    /**
     * Get the ingredient for this base unit
     */
    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'ingredient_id', 'ingredient_id');
    }

    /**
     * Get the unit details
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'base_unit', 'unit_code');
    }
}
