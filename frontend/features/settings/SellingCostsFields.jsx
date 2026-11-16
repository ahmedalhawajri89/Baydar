'use client';

import { useI18n } from '@/features/i18n/I18nProvider';
import { Field, NumberInput } from '@/components/ui/Field';

/**
 * The rates that turn gross profit into contribution profit (ADR-040).
 *
 * Three groups: a percentage plus a fixed amount per payment method, a
 * percentage per channel, and one default shipping cost. The method and
 * channel keys come from the server's meta, so a method added there appears
 * here without a release of this screen.
 *
 * An emptied field removes the rate rather than storing zero: "costs nothing"
 * and "not stated" read the same to the arithmetic, and the stored settings
 * stay as short as what the owner actually typed.
 */
export function SellingCostsFields({ form, set, disabled, fieldErrors, meta }) {
  const { t } = useI18n();

  const methods = meta?.payment_methods ?? [];
  const channels = meta?.channels ?? [];
  const paymentFees = form?.payment_fees ?? {};
  const channelFees = form?.channel_fees ?? {};

  function setPayment(method, part, value) {
    const current = paymentFees[method] ?? { percent: '', fixed: '' };
    const next = { ...current, [part]: value };
    const rest = { ...paymentFees };

    if (next.percent === '' && next.fixed === '') {
      delete rest[method];
      set('payment_fees', rest);

      return;
    }

    // The server needs both parts; an empty one is a zero.
    set('payment_fees', {
      ...rest,
      [method]: {
        percent: next.percent === '' ? '0' : next.percent,
        fixed: next.fixed === '' ? '0' : next.fixed,
      },
    });
  }

  function setChannel(channel, value) {
    const rest = { ...channelFees };

    if (value === '') {
      delete rest[channel];
    } else {
      rest[channel] = value;
    }

    set('channel_fees', rest);
  }

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className="text-sm font-semibold text-(--color-text)">
          {t('settings.sellingCosts.paymentTitle')}
        </legend>
        <p className="mt-1 mb-3 text-sm text-(--color-text-2)">
          {t('settings.sellingCosts.paymentHint')}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-start text-xs text-(--color-muted)">
                <th scope="col" className="pb-2 text-start font-medium">
                  {t('settings.sellingCosts.method')}
                </th>
                <th scope="col" className="pb-2 text-start font-medium">
                  {t('settings.sellingCosts.percent')}
                </th>
                <th scope="col" className="pb-2 text-start font-medium">
                  {t('settings.sellingCosts.fixed')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-line)">
              {methods.map((method) => {
                const label = t(`paymentMethod.${method}`);

                return (
                  <tr key={method}>
                    <th
                      scope="row"
                      className="py-2 pe-4 text-start font-medium text-(--color-text)"
                    >
                      {label}
                    </th>
                    <td className="py-2 pe-3">
                      <NumberInput
                        aria-label={`${label}: ${t('settings.sellingCosts.percent')}`}
                        value={paymentFees[method]?.percent ?? ''}
                        onChange={(event) => setPayment(method, 'percent', event.target.value)}
                        disabled={disabled}
                        min={0}
                        max={100}
                        step="0.01"
                      />
                    </td>
                    <td className="py-2">
                      <NumberInput
                        aria-label={`${label}: ${t('settings.sellingCosts.fixed')}`}
                        value={paymentFees[method]?.fixed ?? ''}
                        onChange={(event) => setPayment(method, 'fixed', event.target.value)}
                        disabled={disabled}
                        min={0}
                        step="0.001"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {fieldErrors.payment_fees ? (
          <p role="alert" className="mt-2 text-sm text-(--color-danger)">
            {fieldErrors.payment_fees}
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-(--color-text)">
          {t('settings.sellingCosts.channelTitle')}
        </legend>
        <p className="mt-1 mb-3 text-sm text-(--color-text-2)">
          {t('settings.sellingCosts.channelHint')}
        </p>

        <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <Field key={channel} label={t(`dashboard.home.channels.${channel}`)}>
              {(props) => (
                <NumberInput
                  value={channelFees[channel] ?? ''}
                  onChange={(event) => setChannel(channel, event.target.value)}
                  disabled={disabled}
                  min={0}
                  max={100}
                  step="0.01"
                  {...props}
                />
              )}
            </Field>
          ))}
        </div>
        {fieldErrors.channel_fees ? (
          <p role="alert" className="mt-2 text-sm text-(--color-danger)">
            {fieldErrors.channel_fees}
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-(--color-text)">
          {t('settings.sellingCosts.shippingTitle')}
        </legend>

        <Field
          label={t('settings.sellingCosts.shippingDefault')}
          hint={t('settings.sellingCosts.shippingHint')}
          error={fieldErrors.default_shipping_cost}
          className="mt-3 max-w-md"
        >
          {(props) => (
            <NumberInput
              value={form?.default_shipping_cost ?? ''}
              onChange={(event) =>
                set('default_shipping_cost', event.target.value === '' ? null : event.target.value)
              }
              disabled={disabled}
              min={0}
              step="0.001"
              {...props}
            />
          )}
        </Field>
      </fieldset>
    </div>
  );
}
