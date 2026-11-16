'use client';

import Link from 'next/link';

import { useI18n } from '@/features/i18n/I18nProvider';
import { Card } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { PLANS } from '@/lib/plans';

/**
 * In place of a screen the business's plan does not include (ADR-044).
 *
 * Said before the request is made, from what /me reports about the plan,
 * rather than as an error after it: "this comes with Growth" is a fact about
 * the plan, not something that went wrong. Names the cheapest plan that has
 * it, and reassures that nothing recorded is affected.
 */
export function PlanLocked({ feature }) {
  const { t } = useI18n();
  const plan = PLANS.find((candidate) => candidate.features[feature]);

  return (
    <Card>
      <div className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-control) bg-(--color-accent-soft) text-(--color-accent-strong)">
          <Icon name="lock" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-(--color-text)">
            {t(`plan.locked.${feature}`, {
              plan: plan ? t(`pricing.plans.${plan.key}.name`) : '',
            })}
          </p>
          <p className="text-sm text-(--color-text-2)">{t('plan.locked.body')}</p>
        </div>
        <Link
          href="/pricing"
          className="rounded-(--radius-pill) border border-(--color-line-strong) px-4 py-2 text-sm font-semibold text-(--color-text) hover:bg-(--color-surface-hover)"
        >
          {t('plan.compare')}
        </Link>
      </div>
    </Card>
  );
}
