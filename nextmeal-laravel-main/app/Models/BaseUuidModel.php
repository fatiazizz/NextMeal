<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

abstract class BaseUuidModel extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    /**
     * Override in child if the PK name is not "id".
     * Example: protected $primaryKey = 'user_id';
     */

    protected static function booted()
    {
        static::creating(function ($model) {
            $pk = $model->getKeyName();

            if (empty($model->{$pk})) {
                $model->{$pk} = (string) Str::uuid();
            }
        });
    }
}
