<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecipeCategory extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'recipe_categories';
    protected $primaryKey = 'recipe_category_id';

    protected $fillable = [
        'name',
    ];

    public function recipes(): HasMany
    {
        return $this->hasMany(Recipe::class, 'recipe_category_id', 'recipe_category_id');
    }
}
