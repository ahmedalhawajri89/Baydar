'use client';

import { useState } from 'react';

import { useMissingCosts } from '@/features/catalog/useCatalog';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/features/i18n/I18nProvider';
import { Button } from '@/components/ui/Button';
import { NumberInput } from '@/components/ui/Field';
import { EmptyState, ErrorState, ForbiddenState } from '@/components/data/States';
import { Card, PageHeader } from '@/components/layout/PageHeader';
import { formatMoney, formatNumber } from '@/lib/format';

/**
 * Complete your costs (ADR-042).
 *
 * Every product Baydar has no cost for, best sellers first, with one field
 * each. A zero cost is a gap, not a free good: until it is filled, every sale
 * of that product counts its whole price as profit. Saving can also give the
 * cost to the past order lines recorded without one, which is what makes the
 * profit already reported true; a line that had a real cost keeps it.
 */
export default function CompleteCostsPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const { products, meta, isLoading, isError, error, refetch, save } = useMissingCosts();
  const [costs, setCosts] = useState({});
  const [applyPast, setApplyPast] = useState(true);
  const [notice, setNotice] = useState(null);

  if (!can('products.update') || !can('products.view_cost')) {
    return <ForbiddenState />;
  }

  const typed = Object.entries(costs).filter(([, value]) => value !== '');
  const fieldErrors = save.error?.fieldErrors ?? {};

  function submit(event) {
    event.preventDefault();
    setNotice(null);

    if (typed.length === 0) {
      setNotice({ tone: 'warning', text: t('products.costs.nothingTyped') });

      return;
    }

    save.mutate(
      {
        costs: typed.map(([id, cost]) => ({ product_id: Number(id), cost })),
        apply_to_past_orders: applyPast,
      },
      {
        onSuccess: (response) => {
          setCosts({});
          setNotice({
            tone: 'success',
            text: t('products.costs.saved', {
              products: formatNumber(response.data.products),
              lines: formatNumber(response.data.lines),
            }),
          });
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('products.costs.title')} description={t('products.costs.description')} />

      {notice ? (
        <p
          role="status"
          className={
            notice.tone === 'success'
              ? 'rounded-(--radius-control) bg-(--color-success-soft) px-4 py-3 text-sm text-(--color-success)'
              : 'rounded-(--radius-control) bg-(--color-warning-soft) px-4 py-3 text-sm text-(--color-warning)'
          }
        >
          {notice.text}
        </p>
      ) : null}

      {isError ? (
        <Card padded={false}>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : !isLoading && products.length === 0 ? (
        <Card>
          <EmptyState
            title={t('products.costs.emptyTitle')}
            description={t('products.costs.emptyDescription')}
          />
        </Card>
      ) : (
        <form onSubmit={submit}>
          <Card padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <caption className="sr-only">{t('products.costs.title')}</caption>
                <thead>
                  <tr className="border-b border-(--color-line) text-xs text-(--color-muted)">
                    <th scope="col" className="px-4 py-3 text-start font-medium">
                      {t('products.costs.columns.product')}
                    </th>
                    <th scope="col" className="px-4 py-3 text-end font-medium">
                      {t('products.costs.columns.price')}
                    </th>
                    <th scope="col" className="px-4 py-3 text-end font-medium">
                      {t('products.costs.columns.sold')}
                    </th>
                    <th scope="col" className="w-44 px-4 py-3 text-start font-medium">
                      {t('products.costs.columns.cost')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--color-line)">
                  {products.map((product, index) => (
                    <tr key={product.id}>
                      <th
                        scope="row"
                        className="px-4 py-2.5 text-start font-medium text-(--color-text)"
                      >
                        {product.name}
                        {product.sku ? (
                          <span className="ms-2 font-mono text-xs text-(--color-muted)">
                            {product.sku}
                          </span>
                        ) : null}
                      </th>
                      <td className="tabular px-4 py-2.5 text-end">{formatMoney(product.price)}</td>
                      <td className="tabular px-4 py-2.5 text-end">
                        {formatNumber(product.units_sold)}
                      </td>
                      <td className="px-4 py-2">
                        <NumberInput
                          aria-label={`${product.name}: ${t('products.costs.columns.cost')}`}
                          value={costs[product.id] ?? ''}
                          onChange={(event) =>
                            setCosts({ ...costs, [product.id]: event.target.value })
                          }
                          invalid={Boolean(fieldErrors[`costs.${index}.cost`])}
                          min={0}
                          step="0.0001"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-(--color-line) px-4 py-3">
              <label className="flex min-w-0 flex-1 items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={applyPast}
                  onChange={(event) => setApplyPast(event.target.checked)}
                  className="mt-0.5 size-4 accent-(--color-brand)"
                />
                <span>
                  <span className="font-medium text-(--color-text)">
                    {t('products.costs.applyPast')}
                  </span>
                  <span className="block text-(--color-text-2)">
                    {t('products.costs.applyPastHint')}
                  </span>
                </span>
              </label>
              <Button type="submit" variant="primary" loading={save.isPending}>
                {t('products.costs.save')}
              </Button>
            </div>
          </Card>

          {meta && meta.count >= meta.limit ? (
            <p className="mt-3 text-sm text-(--color-muted)">
              {t('products.costs.limited', { limit: formatNumber(meta.limit) })}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
