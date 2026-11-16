'use client';

import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useI18n } from '@/features/i18n/I18nProvider';
import { useGsap } from '@/hooks/useGsap';
import { formatNumber } from '@/lib/format';

/**
 * The product, toured by scroll (ADR-045).
 *
 * Three questions and three real screens. The section holds still while the
 * reader scrolls; each screen comes in, the camera moves in on the one figure
 * that answers the question, a gold ring marks it and a line names it, and
 * the camera pulls back for the next. A screenshot at full size shows
 * everything at once; this shows the one thing to look at.
 *
 * THE RING DOES NOT MOVE. The image is scaled about the very point the ring
 * stands on, so that point stays where it was while everything around it
 * grows: the ring is placed once, in percent, and is always on target.
 *
 * Wide screens with motion only (`md:motion-safe`). Everywhere else the same
 * three questions are the plain stacked list in Landing (`Views`), which is
 * also what the server renders for them.
 *
 * The focus points are fractions of each screenshot, measured on the images
 * in public/landing; the Arabic screens are laid out mirrored, so they have
 * their own. Retaking the screenshots means measuring these again.
 */
export const TOUR = [
  {
    key: 'profit',
    image: 'dashboard',
    focus: { ar: { x: 0.656, y: 0.25 }, en: { x: 0.36, y: 0.256 } },
    zoom: 2.1,
  },
  {
    key: 'cash',
    image: 'cash',
    focus: { ar: { x: 0.375, y: 0.85 }, en: { x: 0.625, y: 0.85 } },
    zoom: 1.7,
  },
  {
    key: 'stock',
    image: 'stock',
    focus: { ar: { x: 0.3, y: 0.65 }, en: { x: 0.7, y: 0.65 } },
    zoom: 1.9,
  },
];

const FORECAST_WEEKS = 13;

export function ProductTour() {
  const { t, locale, dir } = useI18n();

  const root = useGsap(
    (self) => {
      gsap.registerPlugin(ScrollTrigger);
      const q = self.selector;
      const section = q('[data-tour]')[0]?.closest('section');

      gsap.set(q('[data-shot]'), { autoAlpha: 0 });
      gsap.set(q('[data-copy]'), { autoAlpha: 0, y: 24 });
      gsap.set(q('[data-ring]'), { autoAlpha: 0, scale: 0.4 });
      gsap.set(q('[data-callout]'), { autoAlpha: 0, y: 8 });
      gsap.set(q('[data-step]'), { scaleX: 0 });

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: `+=${TOUR.length * 1100}`,
          pin: true,
          scrub: 0.8,
        },
      });

      TOUR.forEach((stop, index) => {
        const at = index * 4;
        const shot = `[data-shot="${stop.key}"]`;
        const image = `[data-image="${stop.key}"]`;
        const last = index === TOUR.length - 1;

        tl.to(q(shot), { autoAlpha: 1, duration: 0.6 }, at)
          .to(q(`[data-copy="${stop.key}"]`), { autoAlpha: 1, y: 0, duration: 0.6 }, at + 0.1)
          .to(q(`[data-step="${stop.key}"]`), { scaleX: 1, duration: 3.6, ease: 'none' }, at)
          .to(q(image), { scale: stop.zoom, duration: 1.2 }, at + 0.7)
          .to(
            q(`[data-ring="${stop.key}"]`),
            { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' },
            at + 1.6,
          )
          .to(q(`[data-callout="${stop.key}"]`), { autoAlpha: 1, y: 0, duration: 0.4 }, at + 1.8);

        if (!last) {
          tl.to(
            q(`[data-ring="${stop.key}"], [data-callout="${stop.key}"]`),
            { autoAlpha: 0, duration: 0.3 },
            at + 3,
          )
            .to(q(image), { scale: 1, duration: 0.6 }, at + 3)
            .to(q(`[data-copy="${stop.key}"]`), { autoAlpha: 0, y: -24, duration: 0.5 }, at + 3.3)
            .to(q(shot), { autoAlpha: 0, duration: 0.5 }, at + 3.5);
        }
      });
    },
    [locale],
  );

  return (
    <section
      ref={root}
      aria-labelledby="tour-title"
      className="hidden bg-(--color-ground) md:motion-safe:block"
    >
      <div
        data-tour
        className="mx-auto grid h-svh max-w-6xl grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] items-center gap-14 px-10"
      >
        <div>
          <h2 id="tour-title" className="text-3xl font-bold text-(--color-text)">
            {t('landing.views.title')}
          </h2>

          <div className="relative mt-10 min-h-56">
            {TOUR.map((stop) => (
              <div key={stop.key} data-copy={stop.key} className="absolute inset-x-0 top-0">
                <h3 className="text-2xl font-bold text-(--color-text)">
                  {t(`landing.views.${stop.key}.question`)}
                </h3>
                <p className="mt-3 text-lg text-(--color-text-2)">
                  {t(`landing.views.${stop.key}.answer`, { weeks: formatNumber(FORECAST_WEEKS) })}
                </p>
              </div>
            ))}
          </div>

          <div aria-hidden="true" className="mt-6 flex gap-2">
            {TOUR.map((stop) => (
              <span
                key={stop.key}
                className="h-1 flex-1 overflow-hidden rounded-(--radius-pill) bg-(--color-line)"
              >
                <span
                  data-step={stop.key}
                  className="block h-full rounded-(--radius-pill) bg-(--color-accent)"
                  style={{ transformOrigin: dir === 'rtl' ? 'right' : 'left' }}
                />
              </span>
            ))}
          </div>
        </div>

        <figure className="relative aspect-[16/10] overflow-hidden rounded-(--radius-panel) border border-(--color-line) bg-(--color-surface) shadow-[0_30px_60px_-30px_rgb(15_39_71/0.35)]">
          {TOUR.map((stop) => {
            const focus = stop.focus[locale] ?? stop.focus.en;
            const origin = `${focus.x * 100}% ${focus.y * 100}%`;

            return (
              <div key={stop.key} data-shot={stop.key} className="absolute inset-0">
                <div
                  data-image={stop.key}
                  className="absolute inset-0"
                  style={{ transformOrigin: origin }}
                >
                  <Image
                    src={`/landing/${stop.image}-${locale}.webp`}
                    alt={t(`landing.views.${stop.key}.alt`)}
                    fill
                    sizes="66vw"
                    className="object-cover object-top"
                  />
                </div>
                <span
                  data-ring={stop.key}
                  aria-hidden="true"
                  className="absolute size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-(--color-accent-on-brand) shadow-[0_0_0_9999px_rgb(10_26_51/0.35)]"
                  style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }}
                />
                <span
                  data-callout={stop.key}
                  className="absolute -translate-x-1/2 rounded-(--radius-pill) bg-(--color-brand-panel) px-4 py-2 text-sm font-semibold whitespace-nowrap text-(--color-on-brand)"
                  style={{
                    left: `${focus.x * 100}%`,
                    top: `calc(${focus.y * 100}% ${focus.y > 0.6 ? '- 7.5rem' : '+ 5.25rem'})`,
                  }}
                >
                  {t(`landing.tour.${stop.key}`)}
                </span>
              </div>
            );
          })}
        </figure>
      </div>
    </section>
  );
}
