<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class UnitConversion extends BaseUuidModel
{
    use HasFactory;

    protected $table = 'unit_conversions';
    protected $primaryKey = 'conversion_id';

    protected $fillable = [
        'from_unit',
        'to_unit',
        'multiplier',
    ];

    protected $casts = [
        'multiplier' => 'decimal:8',
    ];
}
