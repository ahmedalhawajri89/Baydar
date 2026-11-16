'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/features/i18n/I18nProvider';
import { formatNumber } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import * as planService from '@/services/plan';

/**
 * The business's plan and what it uses against each limit (ADR-044), on the
 * settings page.
 *
 * A bar only where there is a limit: "4, no limit" needs no bar, and a bar
 * that never fills would suggest a ceiling that is not there. The bar turns
 * to the warning tone at the limit, because that is when adding is refused.
 */
const LIMITS = ['channels', 'users', 'questions'];

export function PlanUsage() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.plan.detail,
    queryFn: planService.getPlan,
  });
  const plan = data?.data;

  if (isLoading || !plan) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-(--color-text)">
          {t('plan.current', { plan: t(`pricing.plans.${plan.plan}.name`) })}
        </p>
        <Link
          href="/pricing"
          className="text-sm font-semibold text-(--color-brand-text) underline underline-offset-4"
        >
          {t('plan.compare')}
        </Link>
      </div>

      {plan.demo ? <p className="text-sm text-(--color-text-2)">{t('plan.demo')}</p> : null}

      <dl className="space-y-4">
        {LIMITS.map((key) => {
          const used = plan.usage[key] ?? 0;
          const limit = plan.limits[key];
          const full = limit !== null && used >= limit;

          return (
            <div key={key}>
              <div className="flex justify-between gap-4 text-sm">
                <dt className="text-(--color-text-2)">{t(`plan.usage.${key}`)}</dt>
                <dd className="tabular font-medium text-(--color-text)">
                  {limit === null
                    ? t('plan.unlimited', { used: formatNumber(used) })
                    : t('plan.of', { used: formatNumber(used), limit: formatNumber(limit) })}
                </dd>
              </div>
              {limit !== null ? (
                <div
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 overflow-hidden rounded-(--radius-pill) bg-(--color-surface-hover)"
                >
                  <div
                    className={
                      full
                        ? 'h-full rounded-(--radius-pill) bg-(--color-warning)'
                        : 'h-full rounded-(--radius-pill) bg-(--color-brand)'
                    }
                    style={{ width: `${Math.min(100, (used / Math.max(limit, 1)) * 100)}%` }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </dl>

      <p className="text-sm text-(--color-text-2)">{t('plan.change')}</p>
    </div>
  );
}
