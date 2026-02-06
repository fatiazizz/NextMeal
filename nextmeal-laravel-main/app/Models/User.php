<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $keyType = 'string';

    // System user ID constant
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->user_id)) {
                $model->user_id = (string) Str::uuid();
            }
        });
    }

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'password',
        'role',
        'notifications_enabled',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'notifications_enabled' => 'boolean',
            'password' => 'hashed',
        ];
    }

    // Role constants
    const ROLE_SYSTEM = 'system';
    const ROLE_ADMIN = 'admin';
    const ROLE_USER = 'user';

    /**
     * Check if user is system user
     */
    public function isSystem(): bool
    {
        return $this->role === self::ROLE_SYSTEM;
    }

    /**
     * Check if user is admin
     */
    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    /**
     * Check if user can edit a recipe
     */
    public function canEditRecipe(Recipe $recipe): bool
    {
        // System user can't edit (can't even login)
        if ($this->isSystem()) {
            return false;
        }

        // Admin can edit all recipes
        if ($this->isAdmin()) {
            return true;
        }

        // User can only edit their own recipes
        return $recipe->owner_user_id === $this->user_id;
    }

    /**
     * Check if user can delete a recipe
     */
    public function canDeleteRecipe(Recipe $recipe): bool
    {
        // System user can't delete
        if ($this->isSystem()) {
            return false;
        }

        // Admin can delete their own recipes and system recipes
        if ($this->isAdmin()) {
            return $recipe->owner_user_id === $this->user_id || 
                   $recipe->owner_user_id === self::SYSTEM_USER_ID;
        }

        // User can only delete their own recipes
        return $recipe->owner_user_id === $this->user_id;
    }

    // Relationships
    public function inventory(): HasMany
    {
        return $this->hasMany(Inventory::class, 'user_id', 'user_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id', 'user_id');
    }

    public function shoppingList(): HasMany
    {
        return $this->hasMany(ShoppingList::class, 'user_id', 'user_id');
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class, 'user_id', 'user_id');
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(Recipe::class, 'owner_user_id', 'user_id');
    }
}
