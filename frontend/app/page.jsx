import { Landing } from '@/features/marketing/Landing';
import { requestLocale } from '@/lib/i18n/server';
import ar from '@/lib/i18n/messages/ar';
import en from '@/lib/i18n/messages/en';

/**
 * The front door for someone who has not signed in (ADR-043).
 *
 * It used to send every visitor straight to /login: a stranger met a
 * password field before they had been told what the product does. Now it is
 * the public page. A signed-in visitor is offered their dashboard from the
 * header instead of being redirected, and the installed application starts
 * at /dashboard (app/manifest.js), so nobody who uses Baydar daily passes
 * through here.
 *
 * A server component only for the title and description, which a search
 * engine and a link preview read in the visitor's language.
 */
export async function generateMetadata() {
  const messages = (await requestLocale()) === 'ar' ? ar : en;

  return {
    title: messages.landing.meta.title,
    description: messages.landing.meta.description,
  };
}

export default function RootPage() {
  return <Landing />;
}
