<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\InsuranceProduct;

class InsuranceProductController extends Controller
{
    /**
     * List all active insurance products (for dropdown selectors).
     */
    public function index()
    {
        $products = InsuranceProduct::active()
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'category', 'description', 'base_premium_rate']);

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }
}
