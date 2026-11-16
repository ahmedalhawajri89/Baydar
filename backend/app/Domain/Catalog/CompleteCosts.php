<?php

declare(strict_types=1);

namespace App\Domain\Catalog;

use App\Domain\Audit\AuditRecorder;
use App\Domain\Orders\OrderStatus;
use App\Models\Product;
use App\Support\Money;
use App\Support\Tenancy\TenantQuery;
use Illuminate\Support\Facades\DB;

/**
 * The products whose cost Baydar does not know, and filling it in (ADR-042).
 *
 * An imported order carries the cost its product had when it arrived, and a
 * product a store never priced costs zero. A zero there is not a free good:
 * it is a gap, and every order of that product reports its whole price as
 * profit. This is where the owner closes the gaps in one sitting.
 *
 * Filling a cost in can also reach back: order lines recorded at ZERO cost
 * for that product take the new cost, and their orders' cost of goods is
 * summed again. Only zero lines. A line that carries a real cost keeps it,
 * because that cost was true on its day (METRICS.md §2.6); a zero was never
 * true, only unknown.
 */
final class CompleteCosts
{
    public const LIMIT = 200;

    public function __construct(private readonly AuditRecorder $recorder) {}

    /**
     * Active products at zero cost, those that sold the most first.
     *
     * @return list<array{id: int, name: string, sku: string, price: string, units_sold: int, open_lines: int}>
     */
    public function missing(): array
    {
        $sold = TenantQuery::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', OrderStatus::qualifying())
            ->where('order_items.unit_cost', 0)
            ->whereNotNull('order_items.product_id')
            ->groupBy('order_items.product_id')
            ->selectRaw('order_items.product_id AS product_id, SUM(order_items.quantity) AS units, COUNT(*) AS lines_count')
            ->get()
            ->keyBy('product_id');

        return Product::query()
            ->where('is_active', true)
            ->where('cost', 0)
            ->get(['id', 'name', 'sku', 'price'])
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => (string) $product->sku,
                'price' => (string) $product->price,
                'units_sold' => (int) ($sold[$product->id]->units ?? 0),
                'open_lines' => (int) ($sold[$product->id]->lines_count ?? 0),
            ])
            ->sortByDesc('units_sold')
            ->take(self::LIMIT)
            ->values()
            ->all();
    }

    /**
     * Set each product's cost, and optionally give it to its zero-cost lines.
     *
     * @param  array<int, string>  $costs  product id => cost
     * @return array{products: int, lines: int, orders: int}
     */
    public function apply(array $costs, bool $toPastOrders, ?int $actorId): array
    {
        return DB::transaction(function () use ($costs, $toPastOrders, $actorId): array {
            $products = Product::query()->whereIn('id', array_keys($costs))->lockForUpdate()->get();
            $lines = 0;
            $orders = [];

            foreach ($products as $product) {
                $cost = Money::round($costs[$product->id], 4);
                $product->update(['cost' => $cost]);

                if (! $toPastOrders || bccomp($cost, '0', 4) <= 0) {
                    continue;
                }

                $touched = TenantQuery::table('order_items')
                    ->join('orders', 'orders.id', '=', 'order_items.order_id')
                    ->where('order_items.product_id', $product->id)
                    ->where('order_items.unit_cost', 0)
                    ->where('orders.status', '!=', OrderStatus::Draft->value)
                    ->pluck('order_items.order_id')
                    ->all();

                if ($touched === []) {
                    continue;
                }

                $lines += TenantQuery::table('order_items')
                    ->where('product_id', $product->id)
                    ->where('unit_cost', 0)
                    ->whereIn('order_id', $touched)
                    ->update(['unit_cost' => $cost]);

                array_push($orders, ...$touched);
            }

            $orders = array_values(array_unique($orders));
            $this->recost($orders);

            $this->recorder->record(
                action: 'products.costs_completed',
                context: ['products' => $products->count(), 'lines' => $lines, 'orders' => count($orders)],
                actorId: $actorId,
            );

            return ['products' => $products->count(), 'lines' => $lines, 'orders' => count($orders)];
        });
    }

    /**
     * Sum each order's cost of goods again from its lines, the way
     * ConfirmOrder does, so the frozen total agrees with the lines it froze.
     *
     * @param  list<int>  $orderIds
     */
    private function recost(array $orderIds): void
    {
        foreach (array_chunk($orderIds, 500) as $chunk) {
            $totals = TenantQuery::table('order_items')
                ->whereIn('order_id', $chunk)
                ->groupBy('order_id')
                ->selectRaw('order_id, SUM(unit_cost * quantity) AS cogs')
                ->pluck('cogs', 'order_id');

            foreach ($totals as $orderId => $cogs) {
                TenantQuery::table('orders')->where('id', $orderId)->update(['cogs_amount' => Money::round((string) $cogs)]);
            }
        }
    }
}
