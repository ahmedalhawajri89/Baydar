<?php

declare(strict_types=1);

use App\Domain\Orders\ConfirmOrder;
use App\Models\ActivityLog;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| Complete your costs (ADR-042)
|--------------------------------------------------------------------------
|
| A product at zero cost is a gap, not a free good. The owner fills the gaps
| in one place, and may give the cost to the order lines that were recorded
| without one. A line that had a real cost keeps it.
|
*/

/** A confirmed order of `$quantity` of `$product` at whatever cost it has now. */
function costOrder(Product $product, int $quantity = 2): Order
{
    $order = Order::factory()->create();
    $order->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'product_sku' => $product->sku,
        'unit_price' => $product->price,
        'unit_cost' => $product->cost,
        'quantity' => $quantity,
        'line_discount' => 0,
        'line_total' => 0,
    ]);

    return app(ConfirmOrder::class)($order);
}

it('lists the active products without a cost, best sellers first', function (): void {
    $slow = Product::factory()->priced(10.0, 0.0)->withStock(50)->create(['name' => 'Slow']);
    $fast = Product::factory()->priced(10.0, 0.0)->withStock(50)->create(['name' => 'Fast']);
    Product::factory()->priced(10.0, 4.0)->withStock(50)->create(['name' => 'Priced']);
    costOrder($slow, 1);
    costOrder($fast, 5);

    $response = $this->actingAs(User::factory()->owner()->create())
        ->getJson('/api/v1/products/missing-costs')
        ->assertOk();

    expect(array_column($response->json('data'), 'name'))->toBe(['Fast', 'Slow'])
        ->and($response->json('data.0.units_sold'))->toBe(5)
        ->and($response->json('meta.lines_without_cost'))->toBe(2);
});

it('gives the cost to lines recorded without one, and leaves real costs alone', function (): void {
    $product = Product::factory()->priced(10.0, 0.0)->withStock(50)->create();
    $unknown = costOrder($product, 3);

    // A later order carried a real cost of 2.5, which was true on its day.
    $product->update(['cost' => '2.5']);
    $known = costOrder($product, 2);
    $product->update(['cost' => '0']);

    $this->actingAs(User::factory()->owner()->create())
        ->postJson('/api/v1/products/costs', [
            'costs' => [['product_id' => $product->id, 'cost' => 4]],
            'apply_to_past_orders' => true,
        ])
        ->assertOk()
        ->assertJsonPath('data', ['products' => 1, 'lines' => 1, 'orders' => 1]);

    // 3 × 4 = 12.000; the known order stays at 2 × 2.5 = 5.000.
    expect($unknown->refresh()->cogs_amount)->toBe('12.000')
        ->and($known->refresh()->cogs_amount)->toBe('5.000')
        ->and($product->refresh()->cost)->toBe('4.0000')
        ->and(ActivityLog::query()->where('action', 'products.costs_completed')->exists())->toBeTrue();
});

it('sets the cost for orders to come only, when asked to', function (): void {
    $product = Product::factory()->priced(10.0, 0.0)->withStock(50)->create();
    $past = costOrder($product, 3);

    $this->actingAs(User::factory()->owner()->create())
        ->postJson('/api/v1/products/costs', ['costs' => [['product_id' => $product->id, 'cost' => 4]]])
        ->assertOk()
        ->assertJsonPath('data.lines', 0);

    expect($past->refresh()->cogs_amount)->toBe('0.000')
        ->and(costOrder($product, 1)->cogs_amount)->toBe('4.000');
});

it('is closed to a role that cannot see cost', function (): void {
    $product = Product::factory()->priced(10.0, 0.0)->create();

    $staff = User::factory()->staff()->create();

    $this->actingAs($staff)->getJson('/api/v1/products/missing-costs')->assertForbidden();
    $this->actingAs($staff)
        ->postJson('/api/v1/products/costs', ['costs' => [['product_id' => $product->id, 'cost' => 4]]])
        ->assertForbidden();
});

it('refuses a product that is not this business\'s, or a negative cost', function (): void {
    $owner = User::factory()->owner()->create();

    $this->actingAs($owner)
        ->postJson('/api/v1/products/costs', ['costs' => [['product_id' => 999999, 'cost' => 4]]])
        ->assertUnprocessable()->assertJsonValidationErrors('costs.0.product_id');

    $product = Product::factory()->create();
    $this->actingAs($owner)
        ->postJson('/api/v1/products/costs', ['costs' => [['product_id' => $product->id, 'cost' => -1]]])
        ->assertUnprocessable()->assertJsonValidationErrors('costs.0.cost');
});
