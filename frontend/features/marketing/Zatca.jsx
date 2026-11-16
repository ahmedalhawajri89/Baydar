'use client';

import { gsap } from 'gsap';

import { PublicPage } from './PublicPage';
import {
  ZATCA_ANNOUNCED,
  ZATCA_CURRENCY,
  ZATCA_DEADLINE,
  ZATCA_REVIEWED,
  ZATCA_THRESHOLD,
  ZATCA_URL,
  ZATCA_WAVE,
  ZATCA_YEARS,
  waveProgress,
} from './zatcaFacts';
import { useI18n } from '@/features/i18n/I18nProvider';
import { Icon } from '@/components/ui/Icon';
import { useGsap } from '@/hooks/useGsap';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';

/**
 * Baydar and ZATCA: a written stance (ADR-043).
 *
 * The first question every Saudi merchant asks of any software is whether
 * it is ZATCA compliant. The honest answer is that Baydar is not invoicing
 * software and does not claim to be, so the page says that first, in the
 * band, before anything else. Then exactly what Baydar does with VAT, what it
 * does not do, who issues the invoices instead, and whether the current wave
 * reaches the reader.
 *
 * THE ONE MOVING THING is the wave's timeline: from the announcement to the
 * deadline, with today marked, so "about two months left" is seen rather
 * than worked out. It fills to today once, on load.
 */
const DOES = ['line', 'revenue', 'report'];
const DOES_NOT = ['invoices', 'qr', 'fatoora', 'returns', 'purchases'];

function Timeline() {
  const { t, locale, dir } = useI18n();
  const { progress, daysLeft } = waveProgress();
  const start = dir === 'rtl' ? 'right' : 'left';

  const root = useGsap(
    (self) => {
      const q = self.selector;

      gsap
        .timeline({ defaults: { ease: 'power2.out' } })
        .from(q('[data-fill]'), { scaleX: 0, duration: 1.1, ease: 'power3.inOut' }, 0.2)
        .from(q('[data-marker]'), { autoAlpha: 0, y: -8, duration: 0.4 }, 1.1)
        .from(q('[data-days]'), { autoAlpha: 0, y: 8, duration: 0.5 }, 1.2);
    },
    [locale],
  );

  return (
    <figure ref={root} className="mt-12 max-w-3xl" aria-labelledby="wave-label">
      <figcaption id="wave-label" className="text-sm text-(--color-on-brand-2)">
        {t('zatca.timeline.label', { wave: formatNumber(ZATCA_WAVE) })}
      </figcaption>

      <p data-days className="mt-2 text-3xl font-bold text-(--color-accent-on-brand)">
        {daysLeft > 0
          ? t('zatca.timeline.daysLeft', { count: daysLeft })
          : t('zatca.timeline.passed')}
      </p>

      <div className="relative mt-6 h-1.5 rounded-(--radius-pill) bg-(--color-on-brand-raise)">
        <div
          data-fill
          className="absolute inset-y-0 start-0 rounded-(--radius-pill) bg-(--color-accent-on-brand)"
          style={{ width: `${progress * 100}%`, transformOrigin: start }}
        />
        <span
          data-marker
          aria-hidden="true"
          className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-(--color-brand-panel) bg-(--color-on-brand) rtl:translate-x-1/2 ltr:-translate-x-1/2"
          style={{ insetInlineStart: `${progress * 100}%` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-(--color-on-brand-2)">{t('zatca.timeline.announced')}</dt>
          <dd className="font-medium text-(--color-on-brand)">{formatDate(ZATCA_ANNOUNCED)}</dd>
        </div>
        <div className="text-center">
          <dt className="text-(--color-on-brand-2)">{t('zatca.timeline.today')}</dt>
          <dd className="font-medium text-(--color-on-brand)">{formatDate(new Date())}</dd>
        </div>
        <div className="text-end">
          <dt className="text-(--color-on-brand-2)">{t('zatca.timeline.deadline')}</dt>
          <dd className="font-medium text-(--color-on-brand)">{formatDate(ZATCA_DEADLINE)}</dd>
        </div>
      </dl>
    </figure>
  );
}

function Row({ id, title, children }) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 border-t border-(--color-line) py-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-14"
    >
      <h2 id={id} className="text-2xl font-bold text-(--color-text)">
        {title}
      </h2>
      <div className="measure text-lg text-(--color-text-2)">{children}</div>
    </section>
  );
}

function List({ keys, prefix, icon, tone }) {
  const { t } = useI18n();

  return (
    <ul className="space-y-4">
      {keys.map((key) => (
        <li key={key} className="flex gap-3">
          <span className={`mt-1.5 shrink-0 ${tone}`}>
            <Icon name={icon} size={18} />
          </span>
          <span>{t(`${prefix}.${key}`)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Zatca() {
  const { t, locale, tag } = useI18n();
  const year = (value) => new Intl.NumberFormat(tag, { useGrouping: false }).format(value);
  const link = ZATCA_URL[locale] ?? ZATCA_URL.en;

  return (
    <PublicPage title={t('zatca.title')} answer={t('zatca.answer')} band={<Timeline />}>
      <div className="bg-(--color-surface)">
        <div className="mx-auto max-w-6xl px-6 pb-16 md:px-10 md:pb-24">
          <Row id="zatca-does" title={t('zatca.does.title')}>
            <List keys={DOES} prefix="zatca.does" icon="check" tone="text-(--color-success)" />
          </Row>

          <Row id="zatca-not" title={t('zatca.doesNot.title')}>
            <List keys={DOES_NOT} prefix="zatca.doesNot" icon="ban" tone="text-(--color-danger)" />
          </Row>

          <Row id="zatca-who" title={t('zatca.who.title')}>
            <p>{t('zatca.who.body')}</p>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block font-semibold text-(--color-brand-text) underline underline-offset-4"
            >
              {t('zatca.who.link')}
            </a>
          </Row>

          <Row id="zatca-wave" title={t('zatca.wave.title', { wave: formatNumber(ZATCA_WAVE) })}>
            <p>
              {t('zatca.wave.body', {
                threshold: formatMoney(ZATCA_THRESHOLD, { currency: ZATCA_CURRENCY, decimals: 0 }),
                from: year(ZATCA_YEARS.from),
                to: year(ZATCA_YEARS.to),
                deadline: formatDate(ZATCA_DEADLINE),
              })}
            </p>
            <p className="mt-4 font-medium text-(--color-text)">{t('zatca.wave.note')}</p>
          </Row>

          <Row id="zatca-later" title={t('zatca.later.title')}>
            <p>{t('zatca.later.body')}</p>
          </Row>

          <p className="border-t border-(--color-line) pt-6 text-sm text-(--color-muted)">
            {t('zatca.reviewed', { date: formatDate(ZATCA_REVIEWED) })}
          </p>
        </div>
      </div>
    </PublicPage>
  );
}
