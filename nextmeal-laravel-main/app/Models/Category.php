<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'categories';
    protected $primaryKey = 'category_id';

    protected $fillable = [
        'name',
    ];
        public function ingredients(): HasMany
    {
        return $this->hasMany(Ingredient::class, 'category_id', 'category_id');
    }
}
