import { getPlayerTimezone } from '@/core/timezone/server';
import { createT, parseLocale } from '@/core/i18n';
import { rosterMessages } from '@/features/roster';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { fetchPlayerPreview, PreviewScreen, previewMessages } from '@/features/player-preview';
import { localDate } from '@/lib/dates';

export default async function PlayerPreviewPage({ params }: { params: Promise<{ playerId: string; locale: string }> }) {
  const { playerId, locale } = await params;
  const t = createT(previewMessages, parseLocale(locale));
  const today = localDate(new Date(), await getPlayerTimezone(playerId));
  return <Suspense fallback={<p role="status" className="p-4 text-muted">{t('loading')}</p>}>
    {fetchPlayerPreview(playerId, today).then((result) => {
      if ('data' in result && result.data === null) notFound();
      return <PreviewScreen result={result} today={today} />;
    })}
  </Suspense>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(rosterMessages, parseLocale(locale));
  return { title: t('previewTitle') };
}
