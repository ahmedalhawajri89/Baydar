'use client';

import Link from 'next/link';
import { gsap } from 'gsap';

import { PublicPage } from './PublicPage';
import { useI18n } from '@/features/i18n/I18nProvider';
import { Icon } from '@/components/ui/Icon';
import { useGsap } from '@/hooks/useGsap';
import { cn } from '@/lib/cn';
import { formatMoney, formatNumber } from '@/lib/format';
import { PLANS, PLAN_CURRENCY } from '@/lib/plans';

/**
 * The prices (ADR-043).
 *
 * ONE TABLE, NOT FOUR CARDS. A merchant choosing a plan is comparing the
 * same few limits across four columns, which is what a table is for: each
 * limit is read along its row. Four separate cards would make the reader
 * hold one plan in mind while finding the same line in the next. The plan
 * most merchants need is the one column filled in navy.
 *
 * On a phone a four-column table does not fit, so the same plans are stacked,
 * each with its own list, and the table is not rendered at all below `md`.
 *
 * The only motion is the prices rising into place once, on load.
 */
const ROWS = [
  { key: 'channels', value: (plan) => plan.limits.channels },
  { key: 'users', value: (plan) => plan.limits.users },
  { key: 'questions', value: (plan) => plan.limits.questions },
  { key: 'forecasts', value: (plan) => plan.features.forecasts },
  { key: 'financing', value: (plan) => plan.features.financing },
  { key: 'businesses', value: (plan) => plan.limits.businesses },
];

const EVERY_PLAN = ['profit', 'expenses', 'stock', 'brief', 'roles', 'languages'];

const FAQ = ['vat', 'channel', 'limit', 'pay', 'zatca'];

function Price({ plan }) {
  const { t } = useI18n();

  return (
    <span className="block overflow-hidden">
      <span data-price className="block">
        {plan.price === '0' ? (
          <span className="text-3xl font-bold">{t('pricing.free')}</span>
        ) : (
          <>
            <span className="tabular text-3xl font-bold">
              {formatMoney(plan.price, { currency: PLAN_CURRENCY, decimals: 0 })}
            </span>{' '}
            <span className="text-sm font-normal opacity-80">{t('pricing.perMonth')}</span>
          </>
        )}
      </span>
    </span>
  );
}

function Value({ value }) {
  const { t } = useI18n();

  if (value === true) {
    return (
      <>
        <Icon name="check" size={20} className="inline" />
        <span className="sr-only">{t('pricing.included')}</span>
      </>
    );
  }

  if (value === false) {
    return (
      <>
        <span aria-hidden="true" className="opacity-50">
          —
        </span>
        <span className="sr-only">{t('pricing.notIncluded')}</span>
      </>
    );
  }

  return value === null ? t('pricing.unlimited') : formatNumber(value);
}

function Cta({ plan, onNavy }) {
  const { t } = useI18n();

  return (
    <Link
      href={plan.price === '0' ? '/register' : `/register?plan=${plan.key}`}
      className={cn(
        'inline-block rounded-(--radius-pill) px-4 py-2 text-sm font-semibold transition-colors',
        onNavy
          ? 'bg-(--color-accent-on-brand) text-(--color-brand-panel-deep) hover:bg-(--color-accent-on-brand-strong)'
          : 'border border-(--color-line-strong) text-(--color-text) hover:bg-(--color-surface-hover)',
      )}
    >
      {plan.price === '0' ? t('pricing.cta.free') : t('pricing.cta.paid')}
    </Link>
  );
}

function PlanTable() {
  const { t } = useI18n();
  const navy = 'bg-(--color-brand-panel) text-(--color-on-brand)';

  return (
    <table className="hidden w-full table-fixed border-collapse md:table">
      <caption className="sr-only">{t('pricing.caption')}</caption>
      <thead>
        <tr>
          <td className="w-[22%]" />
          {PLANS.map((plan) => (
            <th
              key={plan.key}
              scope="col"
              className={cn(
                'px-5 pt-5 pb-6 text-start align-top font-normal',
                plan.recommended ? `${navy} rounded-t-(--radius-panel)` : 'text-(--color-text)',
              )}
            >
              <span
                className={cn(
                  'block h-5 text-xs',
                  plan.recommended ? 'text-(--color-accent-on-brand)' : '',
                )}
              >
                {plan.recommended ? t('pricing.recommended') : ''}
              </span>
              <span className="mt-1 block text-lg font-bold">
                {t(`pricing.plans.${plan.key}.name`)}
              </span>
              <span
                className={cn(
                  'mt-1 block min-h-10 text-sm',
                  plan.recommended ? 'text-(--color-on-brand-2)' : 'text-(--color-text-2)',
                )}
              >
                {t(`pricing.plans.${plan.key}.who`)}
              </span>
              <span className="mt-4 block">
                <Price plan={plan} />
              </span>
              <span className="mt-5 block">
                <Cta plan={plan} onNavy={plan.recommended} />
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row, index) => (
          <tr key={row.key}>
            <th
              scope="row"
              className="border-t border-(--color-line) py-4 pe-4 text-start text-sm font-medium text-(--color-text)"
            >
              {t(`pricing.rows.${row.key}`)}
            </th>
            {PLANS.map((plan) => (
              <td
                key={plan.key}
                className={cn(
                  'tabular px-5 py-4 text-start',
                  plan.recommended
                    ? cn(
                        navy,
                        'border-t border-(--color-on-brand-raise)',
                        index === ROWS.length - 1 && 'rounded-b-(--radius-panel)',
                      )
                    : 'border-t border-(--color-line) text-(--color-text)',
                )}
              >
                <Value value={row.value(plan)} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlanStack() {
  const { t } = useI18n();

  return (
    <div className="space-y-4 md:hidden">
      {PLANS.map((plan) => (
        <section
          key={plan.key}
          aria-label={t(`pricing.plans.${plan.key}.name`)}
          className={cn(
            'rounded-(--radius-panel) p-5',
            plan.recommended
              ? 'bg-(--color-brand-panel) text-(--color-on-brand)'
              : 'border border-(--color-line) bg-(--color-surface) text-(--color-text)',
          )}
        >
          {plan.recommended ? (
            <p className="text-xs text-(--color-accent-on-brand)">{t('pricing.recommended')}</p>
          ) : null}
          <h2 className="text-lg font-bold">{t(`pricing.plans.${plan.key}.name`)}</h2>
          <p
            className={
              plan.recommended
                ? 'text-sm text-(--color-on-brand-2)'
                : 'text-sm text-(--color-text-2)'
            }
          >
            {t(`pricing.plans.${plan.key}.who`)}
          </p>
          <div className="mt-4">
            <Price plan={plan} />
          </div>
          <dl className="mt-4 text-sm">
            {ROWS.map((row) => (
              <div
                key={row.key}
                className={cn(
                  'flex justify-between gap-4 border-t py-2.5',
                  plan.recommended ? 'border-(--color-on-brand-raise)' : 'border-(--color-line)',
                )}
              >
                <dt>{t(`pricing.rows.${row.key}`)}</dt>
                <dd className="tabular">
                  <Value value={row.value(plan)} />
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <Cta plan={plan} onNavy={plan.recommended} />
          </div>
        </section>
      ))}
    </div>
  );
}

export function Pricing() {
  const { t, locale } = useI18n();

  const root = useGsap(
    (self) => {
      gsap.from(self.selector('[data-price]'), {
        yPercent: 110,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.15,
      });
    },
    [locale],
  );

  return (
    <PublicPage title={t('pricing.title')} answer={t('pricing.answer')}>
      <section ref={root} aria-label={t('pricing.caption')} className="bg-(--color-ground)">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">
          <PlanTable />
          <PlanStack />

          <div className="mt-14 grid gap-6 md:grid-cols-[22%_1fr]">
            <h2 className="text-lg font-bold text-(--color-text)">
              {t('pricing.everyPlan.title')}
            </h2>
            <ul className="flex flex-wrap gap-x-8 gap-y-3 text-(--color-text-2)">
              {EVERY_PLAN.map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <Icon name="check" size={16} className="text-(--color-success)" />
                  {t(`pricing.everyPlan.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="faq-title"
        className="border-t border-(--color-line) bg-(--color-surface)"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-14 md:px-10 md:py-20">
          <h2 id="faq-title" className="text-3xl font-bold text-(--color-text)">
            {t('pricing.faq.title')}
          </h2>
          <dl>
            {FAQ.map((key) => (
              <div
                key={key}
                className="border-t border-(--color-line) py-6 first:border-t-2 first:border-(--color-text)"
              >
                <dt className="text-lg font-bold text-(--color-text)">
                  {t(`pricing.faq.${key}.q`)}
                </dt>
                <dd className="measure mt-2 text-(--color-text-2)">
                  {t(`pricing.faq.${key}.a`)}
                  {key === 'zatca' ? (
                    <>
                      {' '}
                      <Link
                        href="/zatca"
                        className="font-semibold text-(--color-brand-text) underline underline-offset-4"
                      >
                        {t('landing.zatca.link')}
                      </Link>
                    </>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </PublicPage>
  );
}
