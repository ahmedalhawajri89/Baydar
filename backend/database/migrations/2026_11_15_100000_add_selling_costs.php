<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * What it costs to sell, order by order (ADR-040).
 *
 * Gross profit stopped at the goods. Between it and the expenses sit costs
 * that grow with every order and that no store reports as one figure: the
 * gateway's cut of each payment, the carrier's bill for each parcel, the
 * channel's commission. Without them "did I profit?" is answered too kindly.
 *
 * Each is SNAPSHOTTED onto the order or the payment when it happens, like a
 * line's unit cost: changing a rate in settings tomorrow must not move last
 * quarter's profit.
 *
 *   order_payments.fee_amount   the gateway's fee on this payment
 *   orders.payment_fee_amount   the running sum of the above, kept beside
 *                               amount_paid so metrics read one table
 *   orders.channel_fee_amount   the channel's commission on this order
 *   orders.shipping_cost        what the business pays the carrier. NULL is
 *                               "not known", which is not the same as free:
 *                               an unknown cost is left out rather than
 *                               guessed, and the customer's shipping charge
 *                               is then read as having covered it
 *
 * The rates live on the business's settings:
 *
 *   payment_fees           {method: {percent, fixed}}
 *   channel_fees           {source: percent}
 *   default_shipping_cost  applied to an order that states none
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->decimal('payment_fee_amount', 15, 3)->default(0)->after('cogs_amount');
            $table->decimal('channel_fee_amount', 15, 3)->default(0)->after('payment_fee_amount');
            $table->decimal('shipping_cost', 15, 3)->nullable()->after('channel_fee_amount');
        });

        Schema::table('order_payments', function (Blueprint $table): void {
            $table->decimal('fee_amount', 15, 3)->default(0)->after('amount');
        });

        Schema::table('business_settings', function (Blueprint $table): void {
            $table->json('payment_fees')->nullable();
            $table->json('channel_fees')->nullable();
            $table->decimal('default_shipping_cost', 15, 3)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table): void {
            $table->dropColumn(['payment_fees', 'channel_fees', 'default_shipping_cost']);
        });

        Schema::table('order_payments', function (Blueprint $table): void {
            $table->dropColumn('fee_amount');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn(['payment_fee_amount', 'channel_fee_amount', 'shipping_cost']);
        });
    }
};
