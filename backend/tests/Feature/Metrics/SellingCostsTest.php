<?php

declare(strict_types=1);

use App\Domain\Integrations\Import\ImportedOrder;
use App\Domain\Integrations\Import\ImportedPayment;
use App\Domain\Integrations\Import\RecordImportedOrder;
use App\Domain\Metrics\MetricCalculator;
use App\Domain\Metrics\Period;
use App\Domain\Orders\ConfirmOrder;
use App\Domain\Orders\OrderStatus;
use App\Domain\Payments\PaymentMethod;
use App\Domain\Payments\RecordPayment;
use App\Models\BusinessSetting;
use App\Models\Expense;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| What it costs to sell (ADR-040)
|--------------------------------------------------------------------------
|
| Gateway fees, channel commissions and the carrier's bill, snapshotted
| order by order, and the profit they leave. Every expected figure is worked
| out by hand beside its assertion.
|
*/

/** @param  array<string, mixed>  $rates */
function sellingRates(array $rates): void
{
    BusinessSetting::current()->forceFill($rates)->save();
}

/** A manual order of two at 100.000 each, costing 40.000 each, confirmed. */
function sellingOrder(string $shipping = '0'): Order
{
    $product = Product::factory()->priced(100.0000, 40.0000)->withStock(10)->create();
    $order = Order::factory()->create(['shipping_amount' => $shipping]);

    $order->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'product_sku' => $product->sku,
        'unit_price' => $product->price,
        'unit_cost' => $product->cost,
        'quantity' => 2,
        'line_discount' => 0,
        'line_total' => 0,
    ]);

    return app(ConfirmOrder::class)($order);
}

/** @param  list<ImportedPayment>  $payments */
function sellingImport(string $source, array $payments, string $shipping = '0', string $id = 'X-1'): Order
{
    return app(RecordImportedOrder::class)(new ImportedOrder(
        source: $source,
        externalId: $id,
        status: OrderStatus::Confirmed,
        placedAt: Carbon::now()->subHour(),
        customer: null,
        lines: [],
        subtotal: '200.00',
        discount: '0',
        tax: '0',
        shipping: $shipping,
        total: bcadd('200.00', $shipping, 2),
        payments: $payments,
        cancellationReason: 'Cancelled in the store',
    ));
}

function todayPeriod(): Period
{
    $today = Carbon::now(BusinessSetting::current()->timezone)->toDateString();

    return Period::between(Carbon::parse($today)->subDays(2)->toDateString(), $today);
}

it('changes nothing for a business that states no rates', function (): void {
    $order = sellingOrder('15');
    app(RecordPayment::class)($order, '215', PaymentMethod::Card);

    $metrics = app(MetricCalculator::class);
    $period = todayPeriod();

    expect($metrics->sellingCosts($period))->toBe('0.000')
        ->and($metrics->contributionProfit($period))->toBe($metrics->grossProfit($period))
        ->and($order->refresh()->shipping_cost)->toBeNull()
        ->and($order->payment_fee_amount)->toBe('0.000');
});

it('keeps the gateway fee on the payment, at the rate of the day it was paid', function (): void {
    sellingRates(['payment_fees' => ['card' => ['percent' => '2.5', 'fixed' => '1']]]);
    $order = sellingOrder();

    // 100 × 2.5% + 1 = 3.500
    app(RecordPayment::class)($order, '100', PaymentMethod::Card);

    // The rate doubles; the payment already made keeps its fee.
    sellingRates(['payment_fees' => ['card' => ['percent' => '5', 'fixed' => '1']]]);
    // 100 × 5% + 1 = 6.000
    app(RecordPayment::class)($order, '100', PaymentMethod::Card, reference: 'second');

    $order->refresh();

    expect($order->payments()->pluck('fee_amount')->all())->toBe(['3.500', '6.000'])
        ->and($order->payment_fee_amount)->toBe('9.500');
});

it('never charges a fee larger than the payment', function (): void {
    sellingRates(['payment_fees' => ['cash_on_delivery' => ['percent' => '0', 'fixed' => '25']]]);
    $order = sellingOrder();

    app(RecordPayment::class)($order, '10', PaymentMethod::CashOnDelivery);

    expect($order->refresh()->payment_fee_amount)->toBe('10.000');
});

it('charges an imported order its fees once, however often the store sends it', function (): void {
    sellingRates([
        'payment_fees' => ['installments' => ['percent' => '6', 'fixed' => '1.5']],
        'channel_fees' => ['salla' => '2'],
    ]);

    $payment = [new ImportedPayment('200.00', PaymentMethod::Installments)];
    sellingImport('salla', $payment);
    $order = sellingImport('salla', $payment);

    // 200 × 6% + 1.5 = 13.500; 200 × 2% = 4.000
    expect($order->payment_fee_amount)->toBe('13.500')
        ->and($order->payments()->sum('fee_amount'))->toEqual('13.500')
        ->and($order->channel_fee_amount)->toBe('4.000');
});

it('gives every parcel the default shipping cost, and a shop sale none', function (): void {
    sellingRates(['default_shipping_cost' => '22']);

    $online = sellingImport('zid', []);
    $inShop = sellingOrder();
    $delivered = sellingOrder('15');

    expect($online->shipping_cost)->toBe('22.000')
        ->and($inShop->refresh()->shipping_cost)->toBeNull()
        ->and($delivered->refresh()->shipping_cost)->toBe('22.000');
});

it('keeps a shipping cost the owner typed in when the store sends the order again', function (): void {
    sellingRates(['default_shipping_cost' => '22']);

    $order = sellingImport('shopify', []);
    $order->forceFill(['shipping_cost' => '31'])->save();

    expect(sellingImport('shopify', [])->shipping_cost)->toBe('31.000');
});

it('takes every selling cost out of profit, by hand', function (): void {
    sellingRates([
        'payment_fees' => ['installments' => ['percent' => '6', 'fixed' => '1.5']],
        'channel_fees' => ['salla' => '5'],
        'default_shipping_cost' => '25',
    ]);

    // One Salla order: 200.000 of goods, the customer paid 10.000 for delivery.
    $order = sellingImport('salla', [new ImportedPayment('210.00', PaymentMethod::Installments)], '10');
    // Goods that cost 80.000.
    $order->forceFill(['cogs_amount' => '80'])->save();

    Expense::factory()->create([
        'amount' => '50',
        'incurred_on' => Carbon::now(BusinessSetting::current()->timezone)->toDateString(),
    ]);

    $metrics = app(MetricCalculator::class);
    $period = todayPeriod();

    /*
     * payment fee   210 × 6% + 1.5           = 14.100
     * commission    200 × 5%                 = 10.000
     * shipping      25 charged − 10 recovered = 15.000
     * selling costs                           = 39.100
     * gross profit  200 − 80                 = 120.000
     * contribution  120 − 39.1               =  80.900
     * net profit    80.9 − 50 rent           =  30.900
     */
    expect($metrics->sellingCostParts($period))->toBe([
        'payment_fees' => '14.100',
        'channel_fees' => '10.000',
        'shipping' => '15.000',
    ])
        ->and($metrics->sellingCosts($period))->toBe('39.100')
        ->and($metrics->contributionProfit($period))->toBe('80.900')
        ->and($metrics->netProfit($period))->toBe('30.900')
        ->and($metrics->contributionMargin($period))->toEqualWithDelta(0.4045, 0.00001);
});

it('shows the selling costs to an owner and never to staff', function (): void {
    sellingRates(['channel_fees' => ['manual' => '3']]);
    sellingOrder();

    $range = '?preset=custom&from='.todayPeriod()->from.'&to='.todayPeriod()->to;

    $owner = $this->actingAs(User::factory()->owner()->create())
        ->getJson('/api/v1/analytics/summary'.$range)
        ->assertOk();

    // 200 × 3% = 6.000
    expect($owner->json('data.selling_costs.value'))->toBe('6.000')
        ->and($owner->json('data.contribution_profit.value'))->toBe('114.000');

    // Staff never reach the analytics summary at all; the dashboard is theirs.
    $channels = $this->actingAs(User::factory()->staff()->create())
        ->getJson('/api/v1/dashboard'.$range)
        ->json('data.channels');

    foreach ($channels as $channel) {
        expect($channel)->not->toHaveKey('contribution_margin');
    }
});

it('lets the owner state the rates, and refuses a method it does not know', function (): void {
    $owner = User::factory()->owner()->create();

    $this->actingAs($owner)->patchJson('/api/v1/settings', [
        'payment_fees' => ['card' => ['percent' => 2.5, 'fixed' => 1], 'installments' => ['percent' => 6, 'fixed' => 1.5]],
        'channel_fees' => ['salla' => 2],
        'default_shipping_cost' => 22,
    ])->assertOk()
        ->assertJsonPath('data.payment_fees.installments.percent', '6')
        ->assertJsonPath('data.channel_fees.salla', '2')
        ->assertJsonPath('data.default_shipping_cost', '22.000');

    $this->actingAs($owner)->patchJson('/api/v1/settings', ['payment_fees' => ['bitcoin' => ['percent' => 1, 'fixed' => 0]]])
        ->assertUnprocessable()->assertJsonValidationErrors('payment_fees');

    $this->actingAs($owner)->patchJson('/api/v1/settings', ['channel_fees' => ['amazon' => 10]])
        ->assertUnprocessable()->assertJsonValidationErrors('channel_fees');

    $this->actingAs($owner)->patchJson('/api/v1/settings', ['payment_fees' => ['card' => ['percent' => 150, 'fixed' => 0]]])
        ->assertUnprocessable();
});

it('takes the carrier\'s real bill for one order, from a role that sees margin only', function (): void {
    $order = sellingOrder('15');

    $this->actingAs(User::factory()->owner()->create())
        ->putJson("/api/v1/orders/{$order->id}/shipping-cost", ['shipping_cost' => 27.5])
        ->assertOk()
        ->assertJsonPath('data.shipping_cost', '27.500')
        // 200 − 80 goods = 120; less 27.5 charged − 15 recovered = 107.500
        ->assertJsonPath('data.contribution_profit', '107.500');

    $this->actingAs(User::factory()->staff()->create())
        ->putJson("/api/v1/orders/{$order->id}/shipping-cost", ['shipping_cost' => 0])
        ->assertForbidden();

    // Staff read the order without any selling cost on it.
    $this->actingAs(User::factory()->staff()->create())
        ->getJson("/api/v1/orders/{$order->id}")
        ->assertOk()
        ->assertJsonMissingPath('data.shipping_cost')
        ->assertJsonMissingPath('data.payment_fee_amount');

    // 27.5 charged − 15 recovered = 12.500
    expect(app(MetricCalculator::class)->sellingCosts(todayPeriod()))->toBe('12.500');
});
