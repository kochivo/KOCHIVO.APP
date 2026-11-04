import { getT } from '@/core/i18n/server';
import { messages } from '@/ui/messages';
import { parseLocale } from '@/core/i18n/locale';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const t = await getT(messages, parseLocale((await params).locale));
  return { title: t('offlineTitle') };
}

// Served by the service worker when an uncached page is opened offline.
export default async function OfflinePage({ params }: Props) {
  const t = await getT(messages, parseLocale((await params).locale));
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 pt-[var(--safe-top)] text-center">
    <h1 className="text-2xl font-bold">{t('noConnectionRightNow')}</h1>
    <p className="text-muted">{t('todaySWorkoutIsSavedOn')}</p>
  </main>;
}
