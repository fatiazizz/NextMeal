<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'notifications';
    protected $primaryKey = 'notification_id';

    protected $fillable = [
        'user_id',
        'ingredient_id',
        'related_inventory_id',
        'notification_type',
        'severity',
        'state',
        'is_read',
        'delivery_status',
        'payload',
        'sent_at',
        'read_at',
        'resolved_at',
        'is_active',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'is_active' => 'boolean',
        'payload' => 'array',
        'sent_at' => 'datetime',
        'read_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'ingredient_id', 'ingredient_id');
    }

    public function relatedInventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class, 'related_inventory_id', 'inventory_id');
    }

    public function getRouteKeyName(): string
    {
        return 'notification_id';
    }

}

