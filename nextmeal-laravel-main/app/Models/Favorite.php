<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Favorite extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'favorites';
    protected $primaryKey = 'favorite_id';

    protected $fillable = [
        'user_id',
        'recipe_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class, 'recipe_id', 'recipe_id');
    }

    public function getRouteKeyName(): string
    {
        return 'favorite_id';
    }
}
