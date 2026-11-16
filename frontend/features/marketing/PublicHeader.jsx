'use client';

import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { IS_DEMO } from '@/features/auth/DemoAccounts';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/features/i18n/I18nProvider';
import { Logo } from '@/components/layout/Logo';
import { useGsap } from '@/hooks/useGsap';
import { cn } from '@/lib/cn';

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
 *
 * FLOATING, ON THE FRONT PAGE (ADR-045). There it stays with the reader: it
 * steps out of the way while they scroll down into the argument, comes back
 * the moment they scroll up looking for it, and takes the navy once it is
 * over the light sections. A gold line along its foot fills as the page is
 * read, the same gold as the line the profit settles on.
 */
export function PublicHeader({ floating = false }) {
  const { t, locale, setPreferences } = useI18n();
  const { isAuthenticated } = useAuth();

  const root = useGsap(
    (self) => {
      if (!floating) return;

      gsap.registerPlugin(ScrollTrigger);
      const header = self.selector('header')[0] ?? null;
      const bar = self.selector('[data-progress]')[0];
      const element = header ?? document.querySelector('[data-floating-header]');

      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (trigger) => {
          gsap.set(bar, { scaleX: trigger.progress });
          const scrolled = trigger.scroll() > 40;
          element?.toggleAttribute('data-scrolled', scrolled);

          if (trigger.scroll() < 200 || trigger.direction < 0) {
            gsap.to(element, { yPercent: 0, duration: 0.35, ease: 'power2.out', overwrite: true });
          } else {
            gsap.to(element, {
              yPercent: -100,
              duration: 0.35,
              ease: 'power2.in',
              overwrite: true,
            });
          }
        },
      });
    },
    [floating],
  );

  const other = locale === 'ar' ? 'en' : 'ar';
  const otherName = locale === 'ar' ? 'English' : 'العربية';

  const linkClass =
    'rounded-(--radius-control) px-2 py-1.5 text-sm text-(--color-on-brand-2) transition-colors hover:text-(--color-on-brand) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-on-brand)';

  return (
    <header
      ref={floating ? root : undefined}
      data-floating-header={floating ? '' : undefined}
      className={cn(
        'z-50',
        floating
          ? 'fixed inset-x-0 top-0 transition-[background-color,box-shadow] duration-300 data-scrolled:bg-(--color-brand-panel)/95 data-scrolled:shadow-[0_10px_30px_-20px_rgb(0_0_0/0.6)] data-scrolled:backdrop-blur'
          : 'relative',
      )}
    >
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
      {floating ? (
        <span
          aria-hidden="true"
          data-progress
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-(--color-accent-on-brand) rtl:origin-right"
        />
      ) : null}
    </header>
  );
}
