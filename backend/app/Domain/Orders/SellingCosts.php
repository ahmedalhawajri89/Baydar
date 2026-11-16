<?php

declare(strict_types=1);

namespace App\Domain\Orders;

use App\Domain\Payments\PaymentMethod;
use App\Models\BusinessSetting;
use App\Models\Order;
use App\Support\Money;

/**
 * What it costs to sell, at the rates the business has stated (ADR-040).
 *
 * The one place a fee is worked out. Every writer that records a payment or
 * commits an order asks here, and SNAPSHOTS the answer onto its row: the
 * rates in settings are today's, and today's must never reprice last month.
 *
 * Nothing here is guessed. A method, a channel or a shipping cost the
 * business has not stated costs nothing, so the figure can only be too kind
 * by what the business has left out, never wrong by what Baydar assumed.
 */
final class SellingCosts
{
    /** Where an order typed in here comes from, for the channel rates. */
    public const MANUAL = 'manual';

    /**
     * Channels that only sell online: every order is a parcel, so the
     * default shipping cost applies to it even when the customer paid no
     * shipping. An order typed in here, or brought from a file, may have
     * been handed over in a shop, so it carries the default only when the
     * customer paid for delivery.
     */
    private const ONLINE = ['salla', 'zid', 'woocommerce', 'shopify', 'api'];

    /** The gateway's fee on one payment: a percentage plus a fixed amount, never more than the payment. */
    public static function paymentFee(PaymentMethod $method, string $amount): string
    {
        $rule = self::paymentRates()[$method->value] ?? null;

        if ($rule === null) {
            return Money::zero();
        }

        $fee = bcadd(
            bcdiv(bcmul($amount, $rule['percent'], 10), '100', 10),
            $rule['fixed'],
            10,
        );

        if (bccomp($fee, $amount, 10) > 0) {
            $fee = $amount;
        }

        return Money::round($fee);
    }

    /** The channel's commission on an order, on what the goods sold for after discount. */
    public static function channelFee(?string $source, string $subtotal, string $discount): string
    {
        $percent = self::channelRates()[$source ?? self::MANUAL] ?? null;

        if ($percent === null) {
            return Money::zero();
        }

        $base = bcsub($subtotal, $discount, 10);

        if (bccomp($base, '0', 10) <= 0) {
            return Money::zero();
        }

        return Money::round(bcdiv(bcmul($base, $percent, 10), '100', 10));
    }

    /**
     * The carrier's bill for an order that states none: the business's
     * default, where the order is a parcel. Null where it is not, or where
     * no default is set.
     */
    public static function defaultShippingFor(Order $order): ?string
    {
        $default = BusinessSetting::current()->default_shipping_cost;

        if ($default === null) {
            return null;
        }

        $online = in_array($order->source, self::ONLINE, true);
        $paidForDelivery = bccomp((string) $order->shipping_amount, '0', Money::scale()) > 0;

        return $online || $paidForDelivery ? Money::round((string) $default) : null;
    }

    /**
     * Stamp an order's channel commission and, if it has none, its shipping
     * cost, at the rates of the moment it is committed.
     *
     * Not saved: the caller writes it with the rest of the commit, in its
     * own transaction.
     */
    public static function stamp(Order $order): void
    {
        $order->forceFill([
            'channel_fee_amount' => self::channelFee(
                $order->source,
                (string) $order->subtotal_amount,
                (string) $order->discount_amount,
            ),
        ]);

        if ($order->shipping_cost === null) {
            $order->forceFill(['shipping_cost' => self::defaultShippingFor($order)]);
        }
    }

    /**
     * The payment rates as stated, normalised to strings.
     *
     * @return array<string, array{percent: string, fixed: string}>
     */
    public static function paymentRates(): array
    {
        $rates = [];

        foreach ((array) (BusinessSetting::current()->payment_fees ?? []) as $method => $rule) {
            if (PaymentMethod::tryFrom((string) $method) === null || ! is_array($rule)) {
                continue;
            }

            $rates[(string) $method] = [
                'percent' => self::number($rule['percent'] ?? 0),
                'fixed' => self::number($rule['fixed'] ?? 0),
            ];
        }

        return $rates;
    }

    /**
     * The channel rates as stated, as percentage strings.
     *
     * @return array<string, string>
     */
    public static function channelRates(): array
    {
        $rates = [];

        foreach ((array) (BusinessSetting::current()->channel_fees ?? []) as $source => $percent) {
            if (in_array((string) $source, self::channels(), true)) {
                $rates[(string) $source] = self::number($percent);
            }
        }

        return $rates;
    }

    /** @return list<string> Every channel a rate can be stated for. */
    public static function channels(): array
    {
        return [self::MANUAL, ...self::ONLINE, 'file'];
    }

    private static function number(mixed $value): string
    {
        return is_numeric($value) ? (string) $value : '0';
    }
}
