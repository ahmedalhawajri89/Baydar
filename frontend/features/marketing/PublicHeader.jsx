'use client';

import Link from 'next/link';

import { IS_DEMO } from '@/features/auth/DemoAccounts';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/features/i18n/I18nProvider';
import { Logo } from '@/components/layout/Logo';

/**
 * The public pages' top line (ADR-043).
 *
 * It stands on the navy band every public page opens with, so it is drawn in
 * the light tones. Two destinations and a door: the pricing and the ZATCA
 * answer are the two things a merchant asks before anything else, and the
 * door is the demo on the demo, an account everywhere else.
 *
 * SIGNED IN, IT SAYS SO. Someone with a session who lands here is offered
 * their dashboard rather than a sign-in form they do not need. The page does
 * not redirect them: they may have come to read the prices.
 *
 * The language switch is the cookie's, as on sign-in: there is no account to
 * save it to yet.
 */
export function PublicHeader() {
  const { t, locale, setPreferences } = useI18n();
  const { isAuthenticated } = useAuth();

  const other = locale === 'ar' ? 'en' : 'ar';
  const otherName = locale === 'ar' ? 'English' : 'العربية';

  const linkClass =
    'rounded-(--radius-control) px-2 py-1.5 text-sm text-(--color-on-brand-2) transition-colors hover:text-(--color-on-brand) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-on-brand)';

  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5 md:px-10">
        <Link
          href="/"
          aria-label={t('common.appName')}
          className="rounded-(--radius-control) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-accent-on-brand)"
        >
          <Logo tone="onBrand" />
        </Link>

        <nav
          aria-label={t('publicSite.nav.label')}
          className="ms-6 hidden items-center gap-1 md:flex"
        >
          <Link href="/pricing" className={linkClass}>
            {t('publicSite.nav.pricing')}
          </Link>
          <Link href="/zatca" className={linkClass}>
            {t('publicSite.nav.zatca')}
          </Link>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            lang={other}
            onClick={() => setPreferences({ locale: other })}
            className={linkClass}
          >
            {otherName}
          </button>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="rounded-(--radius-pill) bg-(--color-accent-on-brand) px-4 py-2 text-sm font-semibold text-(--color-brand-panel-deep) transition-colors hover:bg-(--color-accent-on-brand-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-on-brand)"
            >
              {t('publicSite.nav.dashboard')}
            </Link>
          ) : (
            <>
              <Link href="/login" className={`${linkClass} hidden sm:inline-flex`}>
                {t('publicSite.nav.signIn')}
              </Link>
              <Link
                href={IS_DEMO ? '/login' : '/register'}
                className="rounded-(--radius-pill) bg-(--color-accent-on-brand) px-4 py-2 text-sm font-semibold text-(--color-brand-panel-deep) transition-colors hover:bg-(--color-accent-on-brand-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-on-brand)"
              >
                {IS_DEMO ? t('publicSite.cta.demo') : t('publicSite.cta.start')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
