<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecipeStep extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'recipe_steps';
    protected $primaryKey = 'recipe_step_id';

    protected $fillable = [
        'recipe_id',
        'step_number',
        'description',
    ];

    protected $casts = [
        'step_number' => 'integer',
    ];

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class, 'recipe_id', 'recipe_id');
    }

    public function getRouteKeyName(): string
    {
        return 'recipe_step_id';
    }
}
