'use client';

import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';

import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';
import { Threshing } from './Threshing';
import { IS_DEMO } from '@/features/auth/DemoAccounts';
import { toWords } from '@/features/auth/authMotion';
import { useI18n } from '@/features/i18n/I18nProvider';
import { useGsap } from '@/hooks/useGsap';
import { formatMoney, formatNumber } from '@/lib/format';
import { LOWEST_PAID_PRICE, PLAN_CURRENCY } from '@/lib/plans';

/**
 * The public front page (ADR-043).
 *
 * ONE ARGUMENT, MADE ONCE. A store's dashboard reports what was sold; Baydar
 * reports what was earned. The headline says it, the threshing floor shows
 * it on one real order, and everything after is the evidence a careful
 * merchant asks for: what the product looks like, what it promises, what it
 * costs, and where it stands on ZATCA.
 *
 * MOTION IS SPENT IN ONE PLACE. The headline arrives once, on load, and the
 * threshing floor is driven by the reader's own scroll. Nothing else moves:
 * no section fades up as it enters, because a page where everything moves
 * says nothing with motion.
 *
 * The screenshots are the product itself, taken from the demo with its demo
 * data, in the reader's language.
 */
const VIEWS = [
  { key: 'profit', image: 'dashboard' },
  { key: 'cash', image: 'cash' },
  { key: 'stock', image: 'stock' },
];

const PROMISES = ['records', 'roles', 'isolated', 'assistant'];

const FORECAST_WEEKS = 13;

function Hero() {
  const { t, locale } = useI18n();

  const root = useGsap(
    (self) => {
      const q = self.selector;

      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(q('[data-hero-first]'), { autoAlpha: 0, y: 14, duration: 0.6 })
        .from(q('[data-hero-word]'), { yPercent: 115, duration: 0.6, stagger: 0.06 }, 0.35)
        .from(
          q('[data-hero-after]'),
          { autoAlpha: 0, y: 10, duration: 0.5, stagger: 0.08 },
          '-=0.2',
        );
    },
    [locale],
  );

  return (
    <div ref={root} className="mx-auto max-w-6xl px-6 pt-10 pb-20 md:px-10 md:pt-20 md:pb-28">
      <h1 className="text-display font-bold">
        <span data-hero-first className="block text-(--color-on-brand-2)">
          {t('landing.hero.first')}
        </span>
        <span className="block text-(--color-on-brand)">
          {toWords(t('landing.hero.second')).map((word, index) =>
            /^\s+$/.test(word) ? (
              word
            ) : (
              // Clipped so each word rises from under its own baseline.
              <span key={index} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                <span data-hero-word className="inline-block">
                  {word}
                </span>
              </span>
            ),
          )}
        </span>
      </h1>

      <p data-hero-after className="measure mt-8 text-lead text-(--color-on-brand-2)">
        {t('landing.hero.lead')}
      </p>

      <div data-hero-after className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link
          href={IS_DEMO ? '/login' : '/register'}
          className="rounded-(--radius-pill) bg-(--color-accent-on-brand) px-6 py-3 text-lg font-semibold text-(--color-brand-panel-deep) transition-colors hover:bg-(--color-accent-on-brand-strong) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-on-brand)"
        >
          {IS_DEMO ? t('landing.hero.demo') : t('publicSite.cta.start')}
        </Link>
        <Link
          href="/pricing"
          className="text-lg text-(--color-on-brand) underline decoration-(--color-on-brand-line) underline-offset-8 transition-colors hover:decoration-(--color-accent-on-brand)"
        >
          {t('landing.hero.pricing')}
        </Link>
      </div>

      <p data-hero-after className="mt-12 text-sm text-(--color-on-brand-2)">
        {t('landing.hero.sources')}
      </p>
    </div>
  );
}

function Views() {
  const { t, locale } = useI18n();

  return (
    <section aria-labelledby="views-title" className="bg-(--color-ground)">
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
        <h2
          id="views-title"
          className="max-w-2xl text-3xl font-bold text-(--color-text) md:text-4xl"
        >
          {t('landing.views.title')}
        </h2>

        <div className="mt-14 space-y-20 md:space-y-28">
          {VIEWS.map((view) => (
            <article
              key={view.key}
              className="grid items-start gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-14"
            >
              <div className="md:sticky md:top-10">
                <h3 className="text-2xl font-bold text-(--color-text)">
                  {t(`landing.views.${view.key}.question`)}
                </h3>
                <p className="mt-3 text-lg text-(--color-text-2)">
                  {t(`landing.views.${view.key}.answer`, { weeks: formatNumber(FORECAST_WEEKS) })}
                </p>
              </div>
              <figure className="overflow-hidden rounded-(--radius-panel) border border-(--color-line) bg-(--color-surface)">
                <Image
                  src={`/landing/${view.image}-${locale}.webp`}
                  alt={t(`landing.views.${view.key}.alt`)}
                  width={1280}
                  height={800}
                  sizes="(min-width: 768px) 66vw, 100vw"
                  className="block h-auto w-full"
                />
              </figure>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Promises() {
  const { t } = useI18n();

  return (
    <section
      aria-labelledby="promises-title"
      className="border-t border-(--color-line) bg-(--color-surface)"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-14 md:px-10 md:py-28">
        <h2 id="promises-title" className="text-3xl font-bold text-(--color-text)">
          {t('landing.promises.title')}
        </h2>
        <dl className="grid gap-x-10 sm:grid-cols-2">
          {PROMISES.map((key) => (
            <div key={key} className="border-t-2 border-(--color-text) pt-4 pb-10">
              <dt className="text-lg font-bold text-(--color-text)">
                {t(`landing.promises.${key}.term`)}
              </dt>
              <dd className="mt-2 text-(--color-text-2)">{t(`landing.promises.${key}.body`)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function PriceAndZatca() {
  const { t } = useI18n();
  const price = formatMoney(LOWEST_PAID_PRICE, { currency: PLAN_CURRENCY, decimals: 0 });

  return (
    <section className="border-t border-(--color-line) bg-(--color-ground)">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:gap-16 md:px-10">
        <div>
          <h2 className="text-2xl font-bold text-(--color-text)">{t('landing.pricing.title')}</h2>
          <p className="mt-3 text-lg text-(--color-text-2)">
            {t('landing.pricing.body', { price })}
          </p>
          <Link
            href="/pricing"
            className="mt-5 inline-block font-semibold text-(--color-brand-text) underline underline-offset-4"
          >
            {t('landing.pricing.link')}
          </Link>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-(--color-text)">{t('landing.zatca.title')}</h2>
          <p className="mt-3 text-lg text-(--color-text-2)">{t('landing.zatca.body')}</p>
          <Link
            href="/zatca"
            className="mt-5 inline-block font-semibold text-(--color-brand-text) underline underline-offset-4"
          >
            {t('landing.zatca.link')}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  const { t } = useI18n();

  return (
    <section className="bg-(--color-brand-panel) text-(--color-on-brand)">
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-24">
        <h2 className="max-w-3xl text-3xl font-bold md:text-4xl">
          {IS_DEMO ? t('landing.closing.demoTitle') : t('landing.closing.title')}
        </h2>
        <p className="measure mt-4 text-lg text-(--color-on-brand-2)">
          {IS_DEMO ? t('landing.closing.demoBody') : t('landing.closing.body')}
        </p>
        <Link
          href={IS_DEMO ? '/login' : '/register'}
          className="mt-8 inline-block rounded-(--radius-pill) bg-(--color-accent-on-brand) px-6 py-3 text-lg font-semibold text-(--color-brand-panel-deep) transition-colors hover:bg-(--color-accent-on-brand-strong) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-on-brand)"
        >
          {IS_DEMO ? t('landing.hero.demo') : t('publicSite.cta.start')}
        </Link>
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <>
      <div className="bg-(--color-brand-panel) text-(--color-on-brand)">
        <PublicHeader />
      </div>
      <main id="main">
        <div className="bg-(--color-brand-panel) text-(--color-on-brand)">
          <Hero />
        </div>
        <Threshing />
        <Views />
        <Promises />
        <PriceAndZatca />
        <Closing />
      </main>
      <PublicFooter />
    </>
  );
}
