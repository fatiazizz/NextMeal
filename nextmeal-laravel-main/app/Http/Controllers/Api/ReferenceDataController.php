<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cuisine;
use App\Models\CookingMethod;
use Illuminate\Http\JsonResponse;

class ReferenceDataController extends Controller
{
    /**
     * List cuisines (for recipe form dropdown)
     */
    public function cuisines(): JsonResponse
    {
        $cuisines = Cuisine::orderBy('name', 'asc')->get();

        return response()->json([
            'data' => $cuisines->map(fn ($c) => [
                'id' => $c->cuisine_id,
                'name' => $c->name,
            ]),
        ]);
    }

    /**
     * List cooking methods (for recipe form dropdown)
     */
    public function cookingMethods(): JsonResponse
    {
        $methods = CookingMethod::orderBy('name', 'asc')->get();

        return response()->json([
            'data' => $methods->map(fn ($m) => [
                'id' => $m->method_id,
                'name' => $m->name,
            ]),
        ]);
    }
}
