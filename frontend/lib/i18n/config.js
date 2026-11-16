/**
 * The languages Baydar speaks, and how each is laid out and formatted.
 *
 * Mirrors the server's Localizer: the same two languages and the same two
 * numbering systems, so the sentences the API writes and the labels this
 * client writes always agree on both.
 */

export const LOCALES = {
  en: { dir: 'ltr', intl: 'en-GB', nativeName: 'English' },
  ar: { dir: 'rtl', intl: 'ar-BH', nativeName: 'العربية' },
};

/** CLDR numbering-system names, passed straight into Intl. */
export const NUMERALS = ['latn', 'arab'];

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_NUMERALS = 'latn';

/**
 * Remembers the last language on this browser, so the NEXT page load renders
 * in it from the very first byte — before the session has been checked and
 * the user's saved preference is known. The server reads it to set <html lang
 * dir>, which is what prevents a right-to-left page flashing left-to-right.
 *
 * It is a rendering hint, not the preference: the account's saved choice wins
 * the moment it arrives, and overwrites this.
 */
export const LOCALE_COOKIE = 'opsight_locale';
export const NUMERALS_COOKIE = 'opsight_numerals';

export function isLocale(value) {
  return Object.hasOwn(LOCALES, value);
}

export function normaliseLocale(value) {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function normaliseNumerals(locale, value) {
  // Western digits only mean anything to switch away from in Arabic; English
  // with Arabic-Indic digits is not an option the product offers.
  if (locale !== 'ar') return 'latn';

  return NUMERALS.includes(value) ? value : DEFAULT_NUMERALS;
}

/**
 * The BCP 47 tag every Intl formatter in the application receives.
 *
 * The numbering system travels as a Unicode extension (`-u-nu-arab`) rather
 * than as a separate option, so it applies uniformly to numbers, currency,
 * percentages AND dates without each call site having to remember it.
 */
export function intlTag(locale, numerals) {
  const base = LOCALES[normaliseLocale(locale)].intl;

  return locale === 'ar' ? `${base}-u-nu-${normaliseNumerals(locale, numerals)}` : base;
}

export function directionOf(locale) {
  return LOCALES[normaliseLocale(locale)].dir;
}

/**
 * The language a first-time visitor's browser asks for, from its
 * Accept-Language header (ADR-043).
 *
 * Only for someone with no cookie yet: once a language has been chosen the
 * cookie wins, and once signed in the account does. Without this every new
 * visitor got English, and the public page is written first for a merchant
 * in Riyadh whose browser has been asking for Arabic all along.
 *
 * The first of our two languages in the header's own order of preference,
 * weights included; anything else, or nothing, is the default.
 *
 * @param {string|null|undefined} header  e.g. "ar-SA,ar;q=0.9,en;q=0.8"
 */
export function preferredLocale(header) {
  const ranked = String(header ?? '')
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const weight = q ? Number(q.slice(2)) : 1;

      return {
        lang: tag.toLowerCase().split('-')[0],
        weight: Number.isFinite(weight) ? weight : 0,
        index,
      };
    })
    .filter((entry) => entry.weight > 0 && isLocale(entry.lang))
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  return ranked[0]?.lang ?? DEFAULT_LOCALE;
}
