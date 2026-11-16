import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, isLocale, preferredLocale } from './config';

/**
 * The language to render this request in, on the server: the cookie if one
 * was ever written, else what the browser asks for (ADR-043).
 */
export async function requestLocale() {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;

  if (isLocale(saved)) return saved;

  return preferredLocale((await headers()).get('accept-language'));
}
