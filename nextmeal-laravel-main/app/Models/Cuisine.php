<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cuisine extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'cuisines';
    protected $primaryKey = 'cuisine_id';

    protected $fillable = [
        'name',
    ];

    public function recipes(): HasMany
    {
        return $this->hasMany(Recipe::class, 'cuisine_id', 'cuisine_id');
    }
}
