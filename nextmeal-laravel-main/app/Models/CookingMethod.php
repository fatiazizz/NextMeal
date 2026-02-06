<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CookingMethod extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'cooking_methods';
    protected $primaryKey = 'method_id';

    protected $fillable = [
        'name',
    ];

    public function recipes(): HasMany
    {
        return $this->hasMany(Recipe::class, 'method_id', 'method_id');
    }
}
