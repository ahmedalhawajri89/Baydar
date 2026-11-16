'use client';

import { useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/features/i18n/I18nProvider';
import { useOrderActions } from '@/features/orders/useOrders';
import { Button } from '@/components/ui/Button';
import { NumberInput } from '@/components/ui/Field';
import { formatMoney } from '@/lib/format';

/**
 * What it cost to sell this order (ADR-040), under its gross profit.
 *
 * Every figure is the server's: the fees and commission as snapshotted, and
 * the profit after them worked out by the resource, so nothing here adds up
 * money. The carrier's charge is the one figure an owner corrects by hand,
 * because the carrier's bill arrives after the order, so it is editable in
 * place for a role that may edit orders.
 *
 * Rendered only where the order carries the costs at all: a role that cannot
 * see margin receives none of these keys.
 */
export function OrderSellingCosts({ order, Row }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const { shippingCost } = useOrderActions(order.id);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  if (order.payment_fee_amount === undefined) return null;

  const canEdit = can('orders.update') && order.status !== 'draft' && order.status !== 'cancelled';
  const error = shippingCost.error?.fieldErrors?.shipping_cost;

  function start() {
    setValue(order.shipping_cost ?? '');
    shippingCost.reset();
    setEditing(true);
  }

  function save(next) {
    shippingCost.mutate(next, { onSuccess: () => setEditing(false) });
  }

  return (
    <>
      <Row
        className="border-t border-(--color-line) pt-2.5"
        label={t('orderDetail.sellingCosts.paymentFees')}
        value={formatMoney(order.payment_fee_amount)}
        numeric
      />
      <Row
        label={t('orderDetail.sellingCosts.channelFee')}
        value={formatMoney(order.channel_fee_amount)}
        numeric
      />

      {editing ? (
        <div className="space-y-2">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              save(value === '' ? null : value);
            }}
          >
            <label htmlFor="shipping-cost" className="me-auto text-(--color-text-2)">
              {t('orderDetail.sellingCosts.inputLabel')}
            </label>
            <NumberInput
              id="shipping-cost"
              className="w-36"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              min={0}
              step="0.001"
              invalid={Boolean(error)}
              aria-describedby={error ? 'shipping-cost-error' : undefined}
              autoFocus
            />
            <Button type="submit" variant="primary" size="sm" loading={shippingCost.isPending}>
              {t('orderDetail.sellingCosts.save')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              {t('orderDetail.sellingCosts.cancel')}
            </Button>
          </form>
          {order.shipping_cost !== null ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => save(null)}>
              {t('orderDetail.sellingCosts.clear')}
            </Button>
          ) : null}
          {error ? (
            <p id="shipping-cost-error" role="alert" className="text-sm text-(--color-danger)">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="flex items-center gap-2 text-(--color-text-2)">
            {t('orderDetail.sellingCosts.shippingCost')}
            {canEdit ? (
              <button
                type="button"
                onClick={start}
                className="text-sm font-medium text-(--color-brand-text) hover:underline"
              >
                {t('orderDetail.sellingCosts.edit')}
              </button>
            ) : null}
          </dt>
          <dd className="tabular text-end text-(--color-text)">
            {order.shipping_cost === null
              ? t('orderDetail.sellingCosts.shippingUnknown')
              : formatMoney(order.shipping_cost)}
          </dd>
        </div>
      )}

      <Row
        label={t('metrics.contribution_profit.label')}
        value={formatMoney(order.contribution_profit)}
        numeric
        strong
      />
      <p className="text-sm text-(--color-muted)">{t('orderDetail.sellingCosts.note')}</p>
    </>
  );
}
