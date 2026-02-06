<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShoppingList extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'shopping_list';
    protected $primaryKey = 'shopping_list_id';

    protected $fillable = [
        'user_id',
        'ingredient_id',
        'quantity',
        'unit_code',
        'is_checked',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'is_checked' => 'boolean',
    ];
    
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'ingredient_id', 'ingredient_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_code', 'unit_code');
    }

    public function getRouteKeyName(): string
    {
        return 'shopping_list_id';
    }
}
