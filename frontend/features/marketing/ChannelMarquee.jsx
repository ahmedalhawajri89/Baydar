'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useI18n } from '@/features/i18n/I18nProvider';
import { useGsap } from '@/hooks/useGsap';

/**
 * Where Baydar takes orders from, passing like stalks on the wind
 * (ADR-045).
 *
 * The names drift towards the end of the line, the wind's direction on this
 * page, and scrolling quickens them for a moment: the band answers how fast
 * the reader is moving. Between the names, the grain from Baydar's mark.
 *
 * Read once by assistive technology, as a plain list; the moving band is two
 * copies of it, hidden, so the loop has no seam. For a reader who asked for
 * less motion it stands still.
 */
const CHANNELS = ['salla', 'zid', 'shopify', 'woocommerce', 'excel', 'api'];

function Band({ copy }) {
  const { t } = useI18n();

  return (
    <div className="flex shrink-0 items-center" data-copy={copy}>
      {CHANNELS.map((key, index) => (
        <span key={key} className="flex items-center">
          <span
            className={
              index % 2 === 0
                ? 'px-8 text-4xl font-bold whitespace-nowrap text-(--color-on-brand)'
                : 'px-8 text-4xl font-bold whitespace-nowrap text-transparent [-webkit-text-stroke:1.5px_var(--color-on-brand-line)]'
            }
          >
            {t(`landing.channels.names.${key}`)}
          </span>
          <svg viewBox="0 0 10 10" className="size-2.5 shrink-0" focusable="false">
            <circle cx="5" cy="5" r="5" fill="var(--color-accent-on-brand)" />
          </svg>
        </span>
      ))}
    </div>
  );
}

export function ChannelMarquee() {
  const { t, locale, dir } = useI18n();

  const root = useGsap(
    (self) => {
      gsap.registerPlugin(ScrollTrigger);
      const track = self.selector('[data-track]')[0];
      // Seamless only one way round for each direction: the copy beside the
      // first slides into its place.
      const from = dir === 'rtl' ? 50 : -50;
      const loop = gsap.fromTo(
        track,
        { xPercent: from },
        { xPercent: 0, duration: 28, ease: 'none', repeat: -1 },
      );

      // Speed is tweened on the loop itself; one pending return to normal at
      // a time, pushed back while the reader keeps scrolling.
      let calm = null;
      const speed = (value) =>
        gsap.to(loop, { timeScale: value, duration: 0.5, ease: 'power2.out', overwrite: true });

      ScrollTrigger.create({
        trigger: track,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (trigger) => {
          speed(1 + Math.min(6, Math.abs(trigger.getVelocity()) / 250));
          calm?.kill();
          calm = gsap.delayedCall(0.25, () => speed(1));
        },
      });
    },
    [locale, dir],
  );

  return (
    <section
      ref={root}
      aria-label={t('landing.channels.label')}
      className="overflow-hidden border-y border-(--color-on-brand-raise) bg-(--color-brand-panel) py-7"
    >
      <ul className="sr-only">
        {CHANNELS.map((key) => (
          <li key={key}>{t(`landing.channels.names.${key}`)}</li>
        ))}
      </ul>
      <div aria-hidden="true" data-track className="flex w-max">
        <Band copy="a" />
        <Band copy="b" />
      </div>
    </section>
  );
}
