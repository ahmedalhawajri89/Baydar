'use client';

import Link from 'next/link';

import { useI18n } from '@/features/i18n/I18nProvider';
import { Logo } from '@/components/layout/Logo';

/**
 * The public pages' last line: where else to go, and nothing to sell.
 */
export function PublicFooter() {
  const { t } = useI18n();

  const linkClass =
    'text-sm text-(--color-text-2) underline-offset-4 hover:text-(--color-text) hover:underline';

  return (
    <footer className="border-t border-(--color-line) bg-(--color-surface)">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-(--color-text-2)">{t('publicSite.footer.line')}</p>
        </div>

        <nav aria-label={t('publicSite.footer.label')}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/pricing" className={linkClass}>
                {t('publicSite.nav.pricing')}
              </Link>
            </li>
            <li>
              <Link href="/zatca" className={linkClass}>
                {t('publicSite.nav.zatca')}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClass}>
                {t('publicSite.footer.privacy')}
              </Link>
            </li>
            <li>
              <Link href="/login" className={linkClass}>
                {t('publicSite.nav.signIn')}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
