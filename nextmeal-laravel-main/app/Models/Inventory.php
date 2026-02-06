<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'inventory';
    protected $primaryKey = 'inventory_id';

    protected $fillable = [
        'user_id',
        'ingredient_id',
        'input_quantity',
        'input_unit',
        'base_quantity',
        'base_unit',
        'image_url',
        'minimum_threshold',
        'expiration_date',
        'last_updated',
    ];

    protected $casts = [
        'input_quantity' => 'decimal:3',
        'base_quantity' => 'decimal:3',
        'minimum_threshold' => 'decimal:3',
        'expiration_date' => 'date',
        'last_updated' => 'datetime',
    ];

    /**
     * Check if item is low stock
     */
    public function isLowStock(): bool
    {
        $threshold = $this->minimum_threshold ?? 2;
        return $this->input_quantity <= $threshold;
    }

    /**
     * Check if item is expiring soon (within 3 days)
     */
    public function isExpiringSoon(): bool
    {
        if (!$this->expiration_date) {
            return false;
        }
        return $this->expiration_date->diffInDays(now()) <= 3 && $this->expiration_date->isFuture();
    }

    /**
     * Check if item is expired
     */
    public function isExpired(): bool
    {
        if (!$this->expiration_date) {
            return false;
        }
        return $this->expiration_date->isPast();
    }

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'ingredient_id', 'ingredient_id');
    }

    public function inputUnitRelation(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'input_unit', 'unit_code');
    }

    public function baseUnitRelation(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'base_unit', 'unit_code');
    }

    public function getRouteKeyName(): string
    {
        return 'inventory_id';
    }
}
