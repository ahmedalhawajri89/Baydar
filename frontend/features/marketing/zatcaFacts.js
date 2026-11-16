/**
 * The facts the ZATCA page states (ADR-043), in one place so a new wave is
 * one edit, and each with where it came from.
 *
 * Wave 25 of Phase 2 (integration with the Fatoora platform), announced by
 * ZATCA on 24 July 2026: taxpayers whose VAT-subject revenue exceeded
 * SAR 187,500 in any year from 2022 to 2025 must integrate by
 * 1 February 2027. Checked on 2026-11-16 against the announcement as reported
 * by EY, KPMG and Grant Thornton; ZATCA's own e-invoicing page is linked for
 * the reader to confirm.
 */
export const ZATCA_WAVE = 25;

export const ZATCA_THRESHOLD = '187500';

export const ZATCA_CURRENCY = 'SAR';

export const ZATCA_YEARS = { from: 2022, to: 2025 };

export const ZATCA_ANNOUNCED = '2026-07-24';

export const ZATCA_DEADLINE = '2027-02-01';

/** When this page's facts were last checked. */
export const ZATCA_REVIEWED = '2026-11-16';

export const ZATCA_URL = {
  ar: 'https://zatca.gov.sa/ar/E-Invoicing/Pages/default.aspx',
  en: 'https://zatca.gov.sa/en/E-Invoicing/Pages/default.aspx',
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Where today falls between the announcement and the deadline, and how many
 * whole days are left. Calendar arithmetic on dates, not money.
 *
 * @param {Date} now
 * @returns {{ progress: number, daysLeft: number }}
 */
export function waveProgress(now = new Date()) {
  const start = Date.parse(`${ZATCA_ANNOUNCED}T00:00:00Z`);
  const end = Date.parse(`${ZATCA_DEADLINE}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return {
    progress: Math.min(1, Math.max(0, (today - start) / (end - start))),
    daysLeft: Math.max(0, Math.round((end - today) / DAY)),
  };
}
