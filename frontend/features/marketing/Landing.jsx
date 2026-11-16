'use client';

import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { ChannelMarquee } from './ChannelMarquee';
import { ProductTour } from './ProductTour';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';
import { Threshing } from './Threshing';
import { Magnetic } from './motion/Magnetic';
import { WindField } from './motion/WindField';
import { IS_DEMO } from '@/features/auth/DemoAccounts';
import { toWords } from '@/features/auth/authMotion';
import { useI18n } from '@/features/i18n/I18nProvider';
import { useGsap } from '@/hooks/useGsap';
import { formatMoney, formatNumber } from '@/lib/format';
import { LOWEST_PAID_PRICE, PLAN_CURRENCY } from '@/lib/plans';

/**
 * The public front page (ADR-043, motion ADR-045).
 *
 * ONE ARGUMENT, MADE ONCE. A store's dashboard reports what was sold; Baydar
 * reports what was earned. The headline says it, the threshing floor shows
 * it on one real order, and everything after is the evidence a careful
 * merchant asks for: what the product looks like, what it promises, what it
 * costs, and where it stands on ZATCA.
 *
 * EVERY MOVEMENT IS THE THRESHING FLOOR'S. The wind behind the headline
 * carries chaff and drops grain, and the visitor's pointer is a gust. The
 * channels pass on the same wind. The order is threshed by the reader's
 * scroll. The camera tours the real product and rings the one figure that
 * answers each question. The page closes on the grain falling onto the line
 * of Baydar's mark. The header follows with a gold line that fills as the
 * page is read.
 *
 * NATIVE SCROLLING, DELIBERATELY. ScrollSmoother was tried and removed: it
 * stands aside on any device that reports touch, which includes most
 * Windows laptops, yet still makes every pinned section pin by transform,
 * and the pinned sections then broke. The scrubbed sections ease towards the
 * scroll on their own (`scrub` with a lag), which is the smoothness that
 * matters here.
 *
 * THE MARKUP IS STILL THE END STATE. A reader who asked for less motion gets
 * the plain page: no wind, the threshing ledger complete, the
 * three screens stacked rather than toured.
 */
const VIEWS = [
  { key: 'profit', image: 'dashboard' },
  { key: 'cash', image: 'cash' },
  { key: 'stock', image: 'stock' },
];

const PROMISES = ['records', 'roles', 'isolated', 'assistant'];

const FORECAST_WEEKS = 13;

const primaryCta =
  'inline-block rounded-(--radius-pill) bg-(--color-accent-on-brand) px-6 py-3 text-lg font-semibold text-(--color-brand-panel-deep) transition-colors hover:bg-(--color-accent-on-brand-strong) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-on-brand)';

function Hero() {
  const { t, locale } = useI18n();

  const root = useGsap(
    (self) => {
      gsap.registerPlugin(ScrollTrigger);
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

      // Leaving, the headline sinks back behind the wind rather than
      // scrolling away flat.
      gsap.to(q('[data-hero-copy]'), {
        yPercent: 18,
        autoAlpha: 0.15,
        ease: 'none',
        scrollTrigger: {
          trigger: q('[data-hero-copy]')[0]?.parentElement,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    },
    [locale],
  );

  return (
    <section ref={root} data-hero className="relative overflow-hidden">
      <WindField className="pointer-events-none absolute inset-0 size-full" />

      <div
        data-hero-copy
        className="relative mx-auto max-w-6xl px-6 pt-32 pb-20 md:px-10 md:pt-44 md:pb-28"
      >
        <h1 className="text-display font-bold ltr:text-display-latin">
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
          <Magnetic>
            <Link href={IS_DEMO ? '/login' : '/register'} className={primaryCta}>
              {IS_DEMO ? t('landing.hero.demo') : t('publicSite.cta.start')}
            </Link>
          </Magnetic>
          <Link
            href="/pricing"
            className="text-lg text-(--color-on-brand) underline decoration-(--color-on-brand-line) underline-offset-8 transition-colors hover:decoration-(--color-accent-on-brand)"
          >
            {t('landing.hero.pricing')}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** The three screens, stacked: phones, and readers who asked for less motion. */
function Views() {
  const { t, locale } = useI18n();

  return (
    <section aria-labelledby="views-title" className="bg-(--color-ground) md:motion-safe:hidden">
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
              <div>
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
  const { t, locale } = useI18n();

  const root = useGsap(
    (self) => {
      gsap.registerPlugin(ScrollTrigger);
      const q = self.selector;

      // Each promise is ruled in, then written: a ledger line drawn first.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: q('dl')[0],
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        })
        .from(q('[data-rule]'), { scaleX: 0, duration: 0.8, stagger: 0.12, ease: 'power3.inOut' })
        .from(q('[data-promise]'), { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.12 }, 0.35);
    },
    [locale],
  );

  return (
    <section
      ref={root}
      aria-labelledby="promises-title"
      className="border-t border-(--color-line) bg-(--color-surface)"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-14 md:px-10 md:py-28">
        <h2 id="promises-title" className="text-3xl font-bold text-(--color-text)">
          {t('landing.promises.title')}
        </h2>
        <dl className="grid gap-x-10 sm:grid-cols-2">
          {PROMISES.map((key) => (
            <div key={key} className="pb-10">
              <span
                data-rule
                aria-hidden="true"
                className="block h-0.5 origin-left bg-(--color-text) rtl:origin-right"
              />
              <div data-promise className="pt-4">
                <dt className="text-lg font-bold text-(--color-text)">
                  {t(`landing.promises.${key}.term`)}
                </dt>
                <dd className="mt-2 text-(--color-text-2)">{t(`landing.promises.${key}.body`)}</dd>
              </div>
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

/** The mark, drawn large: the floor, the line the wind sorts along, the grain. */
function Mark() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className="w-40 overflow-visible md:w-56"
      fill="none"
    >
      <path
        data-mark-floor
        d="M28.6 18.6 A12.6 12.6 0 0 1 3.4 18.6 Z"
        fill="var(--color-on-brand)"
        style={{ transformOrigin: '50% 58%' }}
      />
      <path
        data-mark-line
        d="M3.4 18.6h25.2"
        stroke="var(--color-accent-on-brand)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle
        data-mark-grain
        cx="21.5"
        cy="11.5"
        r="1.9"
        fill="var(--color-on-brand)"
        opacity="0.55"
      />
    </svg>
  );
}

function Closing() {
  const { t, locale } = useI18n();

  const root = useGsap(
    (self) => {
      gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
      const q = self.selector;

      gsap
        .timeline({
          defaults: { ease: 'power3.out' },
          scrollTrigger: {
            trigger: q('[data-closing]')[0],
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
        })
        .from(q('[data-mark-line]'), { drawSVG: '50% 50%', duration: 0.7, ease: 'power2.inOut' })
        .from(q('[data-mark-floor]'), { scaleY: 0, duration: 0.6 }, 0.4)
        .from(
          q('[data-mark-grain]'),
          { y: -18, autoAlpha: 0, duration: 0.9, ease: 'bounce.out' },
          0.7,
        )
        .from(q('[data-closing-copy]'), { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.1 }, 0.2);
    },
    [locale],
  );

  return (
    <section ref={root} className="bg-(--color-brand-panel) text-(--color-on-brand)">
      <div
        data-closing
        className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)] md:px-10 md:py-28"
      >
        <div>
          <h2 data-closing-copy className="max-w-3xl text-3xl font-bold md:text-4xl">
            {IS_DEMO ? t('landing.closing.demoTitle') : t('landing.closing.title')}
          </h2>
          <p data-closing-copy className="measure mt-4 text-lg text-(--color-on-brand-2)">
            {IS_DEMO ? t('landing.closing.demoBody') : t('landing.closing.body')}
          </p>
          <div data-closing-copy className="mt-8">
            <Magnetic>
              <Link href={IS_DEMO ? '/login' : '/register'} className={primaryCta}>
                {IS_DEMO ? t('landing.hero.demo') : t('publicSite.cta.start')}
              </Link>
            </Magnetic>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <Mark />
        </div>
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <>
      <PublicHeader floating />
      <main id="main">
        <div className="bg-(--color-brand-panel) text-(--color-on-brand)">
          <Hero />
        </div>
        <ChannelMarquee />
        <Threshing />
        <ProductTour />
        <Views />
        <Promises />
        <PriceAndZatca />
        <Closing />
      </main>
      <PublicFooter />
    </>
  );
}
