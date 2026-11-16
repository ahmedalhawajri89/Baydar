<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Authorization\Ability;
use App\Domain\Catalog\CompleteCosts;
use App\Http\Controllers\Controller;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * "Complete your costs" (ADR-042): the products Baydar has no cost for, and
 * filling them in at once.
 *
 * Both need a role that may see cost AND change products: the list is a list
 * of costs (all zero, but which products sell without one is margin news),
 * and the write moves past cost of goods.
 */
class ProductCostController extends Controller
{
    public function index(Request $request, CompleteCosts $costs): JsonResponse
    {
        $this->allow($request);

        $missing = $costs->missing();

        return response()->json([
            'data' => $missing,
            'meta' => [
                'count' => count($missing),
                'limit' => CompleteCosts::LIMIT,
                'lines_without_cost' => array_sum(array_column($missing, 'open_lines')),
            ],
        ]);
    }

    public function store(Request $request, CompleteCosts $costs): JsonResponse
    {
        $this->allow($request);

        $validated = $request->validate([
            'costs' => ['required', 'array', 'min:1', 'max:'.CompleteCosts::LIMIT],
            'costs.*.product_id' => ['required', 'integer', 'distinct', TenantRule::exists('products')],
            'costs.*.cost' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'apply_to_past_orders' => ['sometimes', 'boolean'],
        ]);

        $map = [];

        foreach ($validated['costs'] as $row) {
            $map[(int) $row['product_id']] = (string) $row['cost'];
        }

        $result = $costs->apply($map, (bool) ($validated['apply_to_past_orders'] ?? false), $request->user()?->id);

        return response()->json(['data' => $result]);
    }

    private function allow(Request $request): void
    {
        $user = $request->user();

        abort_unless(
            $user !== null && $user->can(Ability::ProductsUpdate->value) && $user->can(Ability::ProductsViewCost->value),
            403,
        );
    }
}
