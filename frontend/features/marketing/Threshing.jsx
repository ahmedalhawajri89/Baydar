'use client';

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
  EXAMPLE_CURRENCY,
  EXAMPLE_ORDER,
  EXAMPLE_PROFIT,
  EXAMPLE_PROFIT_SHARE,
  EXAMPLE_STEPS,
} from './example';
import { useI18n } from '@/features/i18n/I18nProvider';
import { useGsap } from '@/hooks/useGsap';
import { formatMoney, formatPercent } from '@/lib/format';

/**
 * The threshing floor: one order, and what is left of it (ADR-043).
 *
 * A بيدر is where the harvest is beaten and thrown into the wind, so the
 * chaff blows off and the grain falls back. That is the product's whole
 * argument, so it is the page's one moving picture and nothing else on the
 * page competes with it.
 *
 * THE DRAWING IS THE DATA. The order is a disc and each cost is a slice of
 * it as large as the money it stands for: the goods are four tenths of the
 * disc because they are four tenths of the order. As the reader scrolls,
 * each slice loosens, the ledger beside it names it, and the wind takes it.
 * What stays is the profit, and it settles under the gold line as the shape
 * of Baydar's own mark: the mark was always this, a floor with the grain on
 * it under the line the wind sorts along. The last shape has the area of the
 * last slice, so even the ending does not exaggerate.
 *
 * THE MARKUP IS THE END STATE. What the server renders, what a reader who
 * asked for less motion sees, and what a crawler reads is the finished
 * ledger: every cost named, the profit stated. The animation only sets the
 * beginning and plays toward what is already there, so nothing depends on
 * it having run.
 *
 * Pinned and scrubbed on a wide screen, where the reader drives it. On a
 * phone a pinned section fights the thumb, so it plays once on arrival
 * instead.
 */
const CX = 200;
const CY = 200;
const R = 160;

function at(angle, radius = R) {
  const a = (angle * Math.PI) / 180;

  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

function wedge(from, to) {
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  const large = to - from > 180 ? 1 : 0;

  return `M${CX} ${CY} L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/*
 * The profit slice sits at the bottom, where the floor is; the costs follow
 * round from its edge in the ledger's order.
 */
const PROFIT_HALF = (EXAMPLE_PROFIT_SHARE * 360) / 2;
const PROFIT_FROM = 90 - PROFIT_HALF;
const PROFIT_TO = 90 + PROFIT_HALF;

const SLICES = EXAMPLE_STEPS.reduce((slices, step) => {
  const from = slices.length ? slices[slices.length - 1].to : PROFIT_TO;
  const to = from + step.share * 360;

  return [...slices, { key: step.key, from, to, mid: (from + to) / 2, d: wedge(from, to) }];
}, []);

const PROFIT_WEDGE = wedge(PROFIT_FROM, PROFIT_TO);

/* A half disc with the same area as the profit slice, under the line. */
const MARK_R = R * Math.sqrt(2 * EXAMPLE_PROFIT_SHARE);
const PROFIT_MARK = `M${CX - MARK_R} ${CY} A${MARK_R} ${MARK_R} 0 0 0 ${CX + MARK_R} ${CY} Z`;

const CHAFF_PER_SLICE = 7;

/** The figures each line of the ledger quotes, as the test sets them. */
const DETAIL_VALUES = {
  paymentFee: { rate: 0.06, fixed: '1.50', paid: '210.00' },
  channelFee: { rate: 0.05 },
  shipping: { carrier: '25.00', paid: '10.00' },
};

export function Threshing() {
  const { t, locale, dir } = useI18n();
  const money = (value) => formatMoney(value, { currency: EXAMPLE_CURRENCY, decimals: 2 });

  function detail(key) {
    const values = DETAIL_VALUES[key] ?? {};

    return t(`landing.threshing.steps.${key}.detail`, {
      rate: values.rate === undefined ? '' : formatPercent(values.rate, { decimals: 0 }),
      fixed: values.fixed ? money(values.fixed) : '',
      paid: values.paid ? money(values.paid) : '',
      carrier: values.carrier ? money(values.carrier) : '',
    });
  }

  const root = useGsap(
    (self) => {
      // Registered here, in the browser, rather than on import: a plugin that
      // measures the window has nothing to measure on the server.
      gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MorphSVGPlugin);
      const q = self.selector;
      const figure = q('[data-figure]')[0];
      const section = q('[data-stage]')[0]?.closest('section');
      // The wind blows the way the line reads: towards the end of it.
      const wind = dir === 'rtl' ? -1 : 1;
      const mm = gsap.matchMedia();
      /*
       * GSAP interpolates colours, not the names of custom properties: a tween
       * between two custom-property references has nothing to blend and jumps through
       * black. So the tokens are read once into the colours they hold.
       */
      const css = getComputedStyle(document.documentElement);
      const colour = (token) => css.getPropertyValue(token).trim();
      const sheaf = colour('--on-brand-line');
      const loose = colour('--on-brand-2');
      const grain = colour('--accent-on-brand');

      const show = (value) => {
        if (figure) figure.textContent = money(value);
      };

      const build = (wide) => {
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: wide
            ? {
                trigger: section,
                start: 'top top',
                end: '+=2600',
                pin: true,
                scrub: 0.8,
              }
            : {
                trigger: q('[data-stage]')[0],
                start: 'top 70%',
                toggleActions: 'play none none none',
              },
        });

        // The beginning: the whole order, nothing named, nothing gone.
        gsap.set(q('[data-row]'), { autoAlpha: 0, y: 10 });
        gsap.set(q('[data-total]'), { autoAlpha: 0, y: 10 });
        // The markup shows the end, so the opening label starts hidden there.
        gsap.set(q('[data-label-start]'), { autoAlpha: 1 });
        gsap.set(q('[data-label-end]'), { autoAlpha: 0 });
        gsap.set(q('[data-slice]'), {
          autoAlpha: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          fill: sheaf,
        });
        gsap.set(q('[data-profit]'), { attr: { d: PROFIT_WEDGE }, fill: sheaf });
        gsap.set(q('[data-line]'), { drawSVG: '50% 50%' });
        gsap.set(q('[data-grain]'), { autoAlpha: 0, scale: 0, transformOrigin: '50% 50%' });
        gsap.set(q('[data-chaff]'), { autoAlpha: 0, x: 0, y: 0, rotation: 0 });
        show(EXAMPLE_ORDER);

        const value = { amount: Number(EXAMPLE_ORDER) };

        EXAMPLE_STEPS.forEach((step, index) => {
          const at0 = 0.4 + index * 1.2;
          const slice = SLICES[index];
          const [ox, oy] = [
            Math.cos((slice.mid * Math.PI) / 180),
            Math.sin((slice.mid * Math.PI) / 180),
          ];
          const target = `[data-slice="${step.key}"]`;

          tl.to(q(`[data-row="${step.key}"]`), { autoAlpha: 1, y: 0, duration: 0.35 }, at0)
            // Loosened: it lifts off the floor and pales, so the eye finds it.
            .to(q(target), { x: ox * 14, y: oy * 14, fill: loose, duration: 0.3 }, at0)
            // Thrown: the wind takes it towards the end of the line.
            .to(
              q(target),
              {
                x: wind * (240 + index * 24),
                y: -90 - index * 12,
                rotation: wind * (50 + index * 18),
                scale: 0.35,
                autoAlpha: 0,
                duration: 0.75,
                ease: 'power2.in',
              },
              at0 + 0.32,
            )
            .to(
              q(`[data-chaff="${step.key}"]`),
              {
                keyframes: [
                  { autoAlpha: 0.9, duration: 0.15 },
                  {
                    x: () => wind * gsap.utils.random(140, 360),
                    y: () => gsap.utils.random(-120, 40),
                    rotation: () => gsap.utils.random(-160, 160),
                    autoAlpha: 0,
                    duration: 0.7,
                    ease: 'power1.out',
                  },
                ],
                stagger: 0.03,
              },
              at0 + 0.36,
            )
            .to(
              value,
              {
                amount: Number(step.after),
                duration: 0.6,
                ease: 'none',
                onUpdate: () => show(value.amount.toFixed(2)),
                // Lands on the exact figure, never on a rounded float.
                onComplete: () => show(step.after),
                onReverseComplete: () =>
                  show(index === 0 ? EXAMPLE_ORDER : EXAMPLE_STEPS[index - 1].after),
              },
              at0 + 0.32,
            );
        });

        const end = 0.4 + EXAMPLE_STEPS.length * 1.2;

        tl.to(q('[data-profit]'), { fill: grain, duration: 0.3 }, end)
          .to(
            q('[data-profit]'),
            { morphSVG: PROFIT_MARK, duration: 0.9, ease: 'power3.inOut' },
            end + 0.2,
          )
          .to(
            q('[data-line]'),
            { drawSVG: '0% 100%', duration: 0.7, ease: 'power2.inOut' },
            end + 0.5,
          )
          .to(
            q('[data-grain]'),
            { autoAlpha: 0.6, scale: 1, duration: 0.4, ease: 'back.out(3)' },
            end + 1,
          )
          .to(q('[data-label-start]'), { autoAlpha: 0, duration: 0.3 }, end + 0.4)
          .to(q('[data-label-end]'), { autoAlpha: 1, duration: 0.3 }, end + 0.6)
          .to(q('[data-total]'), { autoAlpha: 1, y: 0, duration: 0.4 }, end + 0.7);

        if (!wide) tl.timeScale(1.4);
      };

      mm.add('(min-width: 768px)', () => build(true));
      mm.add('(max-width: 767.98px)', () => build(false));

      // A pin measured before the Arabic face arrived is measured wrong.
      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => {
        mm.revert();
        show(EXAMPLE_PROFIT);
      };
    },
    [locale],
  );

  return (
    <section
      ref={root}
      aria-labelledby="threshing-title"
      className="relative overflow-hidden bg-(--color-brand-panel-deep) text-(--color-on-brand)"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:min-h-svh md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-16 md:px-10">
        <div className="order-2 md:order-1">
          <h2
            id="threshing-title"
            className="text-2xl font-bold text-(--color-on-brand) md:text-3xl"
          >
            <span className="block">
              {t('landing.threshing.title', { amount: money(EXAMPLE_ORDER) })}
            </span>
            <span className="block text-(--color-on-brand-2)">
              {t('landing.threshing.question')}
            </span>
          </h2>
          <p className="measure mt-3 text-lg text-(--color-on-brand-2)">
            {t('landing.threshing.lead')}
          </p>

          <div className="mt-8 border-b border-(--color-on-brand-raise) pb-6">
            <p className="relative h-6 text-sm text-(--color-on-brand-2)">
              <span data-label-start className="absolute inset-0 opacity-0">
                {t('landing.threshing.storeShows')}
              </span>
              <span data-label-end className="absolute inset-0 text-(--color-accent-on-brand)">
                {t('landing.threshing.baydarShows')}
              </span>
            </p>
            <p
              data-figure
              aria-hidden="true"
              className="tabular mt-1 text-4xl font-bold text-(--color-on-brand)"
            >
              {money(EXAMPLE_PROFIT)}
            </p>
            <p className="sr-only">
              {t('landing.threshing.summary', {
                amount: money(EXAMPLE_ORDER),
                profit: money(EXAMPLE_PROFIT),
              })}
            </p>
          </div>

          <ol className="mt-2">
            {EXAMPLE_STEPS.map((step) => (
              <li
                key={step.key}
                data-row={step.key}
                className="flex items-baseline justify-between gap-4 border-b border-(--color-on-brand-raise) py-3"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-(--color-on-brand)">
                    {t(`landing.threshing.steps.${step.key}.name`)}
                  </span>
                  <span className="block text-sm text-(--color-on-brand-2)">
                    {detail(step.key)}
                  </span>
                </span>
                <span className="tabular shrink-0 text-(--color-on-brand-2)">
                  {money(`-${step.amount}`)}
                </span>
              </li>
            ))}
            <li
              data-total
              className="flex items-baseline justify-between gap-4 pt-4 font-bold text-(--color-accent-on-brand)"
            >
              <span>{t('landing.threshing.left')}</span>
              <span className="tabular">{money(EXAMPLE_PROFIT)}</span>
            </li>
          </ol>
        </div>

        <div data-stage className="order-1 md:order-2">
          <svg
            viewBox="0 0 400 400"
            aria-hidden="true"
            focusable="false"
            className="mx-auto block w-full max-w-[18rem] overflow-visible md:max-w-[30rem]"
          >
            {SLICES.map((slice) => (
              <path
                key={slice.key}
                data-slice={slice.key}
                d={slice.d}
                fill="var(--color-on-brand-line)"
                stroke="var(--color-brand-panel-deep)"
                strokeWidth="2"
                strokeLinejoin="round"
                opacity="0"
                style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
              />
            ))}

            {SLICES.map((slice) => {
              const [x, y] = at(slice.mid, R * 0.62);

              return Array.from({ length: CHAFF_PER_SLICE }, (_, index) => (
                <line
                  key={`${slice.key}-${index}`}
                  data-chaff={slice.key}
                  x1={x - 6}
                  y1={y + (index - 3) * 5}
                  x2={x + 6}
                  y2={y + (index - 3) * 5 - 3}
                  stroke="var(--color-on-brand-2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0"
                />
              ));
            })}

            <path
              data-profit
              d={PROFIT_MARK}
              fill="var(--color-accent-on-brand)"
              stroke="var(--color-brand-panel-deep)"
              strokeWidth="2"
            />

            <line
              data-line
              x1="16"
              y1={CY}
              x2="384"
              y2={CY}
              stroke="var(--color-accent-on-brand)"
              strokeWidth="9"
              strokeLinecap="round"
            />

            <circle
              data-grain
              cx={CX + MARK_R * 0.62}
              cy={CY - MARK_R * 0.72}
              r="10"
              fill="var(--color-on-brand)"
              opacity="0.6"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
