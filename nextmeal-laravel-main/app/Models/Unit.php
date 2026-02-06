<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use HasFactory;

    protected $table = 'units';
    protected $primaryKey = 'unit_code';
    public $incrementing = false;
    protected $keyType = 'string';

    public $timestamps = false; // اگر units created_at/updated_at نداره

    protected $fillable = [
        'unit_code',
        'unit_kind',
        'base_unit',
        'to_base_factor',
    ];

    protected $casts = [
        'is_base' => 'boolean',
    ];
}
