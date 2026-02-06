<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

class Ingredient extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'ingredients';
    protected $primaryKey = 'ingredient_id';

    protected $fillable = [
        'name',
        'category_id',
        'image_url',
        'default_days_until_expiry',
    ];

    /**
     * Accessor for ingredient_name (alias for name)
     */
    public function getIngredientNameAttribute(): string
    {
        return $this->name;
    }

    /**
     * Get the base unit for this ingredient from ingredient_base_unit table
     */
    public function baseUnit(): HasOne
    {
        return $this->hasOne(IngredientBaseUnit::class, 'ingredient_id', 'ingredient_id');
    }

    /**
     * Get the base unit code for this ingredient
     */
    public function getBaseUnitCodeAttribute(): ?string
    {
        return $this->baseUnit?->base_unit ?? null;
    }

    /**
     * Convert a quantity from input unit to the ingredient's base unit.
     * Uses ingredient_unit_conversions first, then units.to_base_factor when same kind.
     * Returns ['base_quantity' => float, 'base_unit' => string].
     */
    public function convertToBaseQuantity(float $inputQuantity, string $inputUnit): array
    {
        $baseUnit = $this->base_unit_code ?? $inputUnit;
        $inputUnit = trim($inputUnit);
        $baseUnit = trim($baseUnit);

        if ($inputUnit === '' || $baseUnit === '') {
            return ['base_quantity' => $inputQuantity, 'base_unit' => $baseUnit ?: $inputUnit];
        }

        if ($inputUnit === $baseUnit) {
            return ['base_quantity' => $inputQuantity, 'base_unit' => $baseUnit];
        }

        // 1) Ingredient-specific conversion: from_unit -> to_unit, factor means 1 from_unit = factor to_unit
        $conv = DB::table('ingredient_unit_conversions')
            ->where('ingredient_id', $this->ingredient_id)
            ->where('from_unit', $inputUnit)
            ->where('to_unit', $baseUnit)
            ->first();
        if ($conv !== null) {
            $factor = (float) $conv->factor;
            return ['base_quantity' => round($inputQuantity * $factor, 3), 'base_unit' => $baseUnit];
        }

        $convReverse = DB::table('ingredient_unit_conversions')
            ->where('ingredient_id', $this->ingredient_id)
            ->where('from_unit', $baseUnit)
            ->where('to_unit', $inputUnit)
            ->first();
        if ($convReverse !== null) {
            $factor = (float) $convReverse->factor;
            if ($factor != 0) {
                return ['base_quantity' => round($inputQuantity / $factor, 3), 'base_unit' => $baseUnit];
            }
        }

        // 2) Global units table: same kind -> convert via to_base_factor
        $inputUnitRow = DB::table('units')->where('unit_code', $inputUnit)->first();
        $baseUnitRow = DB::table('units')->where('unit_code', $baseUnit)->first();
        if ($inputUnitRow && $baseUnitRow && ($inputUnitRow->unit_kind ?? '') === ($baseUnitRow->unit_kind ?? '')) {
            $toInputBase = (float) ($inputUnitRow->to_base_factor ?? 1);
            $toBaseBase = (float) ($baseUnitRow->to_base_factor ?? 1);
            if ($toBaseBase != 0) {
                $quantityInCommonBase = $inputQuantity * $toInputBase;
                $baseQuantity = $quantityInCommonBase / $toBaseBase;
                return ['base_quantity' => round($baseQuantity, 3), 'base_unit' => $baseUnit];
            }
        }

        // 3) No conversion: store as-is in input unit (so base_unit = input_unit for consistency)
        return ['base_quantity' => $inputQuantity, 'base_unit' => $inputUnit];
    }

    // Relationships
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    /**
     * Units that are allowed for this ingredient (ingredient_allowed_units pivot)
     */
    public function allowedUnits(): BelongsToMany
    {
        return $this->belongsToMany(
            Unit::class,
            'ingredient_allowed_units',
            'ingredient_id',   // Foreign key on pivot for this model
            'unit_code',       // Foreign key on pivot for related model
            'ingredient_id',   // Local key on this model
            'unit_code'        // Local key on related model
        )->select('units.*');
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(Inventory::class, 'ingredient_id', 'ingredient_id');
    }

    public function recipeIngredients(): HasMany
    {
        return $this->hasMany(RecipeIngredient::class, 'ingredient_id', 'ingredient_id');
    }
    
    public function getRouteKeyName(): string
    {
        return 'ingredient_id';
    }
}
