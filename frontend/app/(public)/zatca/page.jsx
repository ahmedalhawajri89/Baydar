import { Zatca } from '@/features/marketing/Zatca';
import { requestLocale } from '@/lib/i18n/server';
import ar from '@/lib/i18n/messages/ar';
import en from '@/lib/i18n/messages/en';

/** A public page (ADR-043): readable without an account, titled in the visitor's language. */
export async function generateMetadata() {
  const messages = (await requestLocale()) === 'ar' ? ar : en;

  return {
    title: messages.zatca.meta.title,
    description: messages.zatca.meta.description,
  };
}

export default function Page() {
  return <Zatca />;
}
