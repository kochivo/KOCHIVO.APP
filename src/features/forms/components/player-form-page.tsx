import 'server-only';
import { getT } from '@/core/i18n/server';
import { z } from 'zod';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Locale } from '@/core/i18n/locale';
import { playerFormsAccess } from '../data/player-access';
import { loadRequest } from '../data/request-load';
import { messages } from '../requests/messages';
import { AnswerEntry } from './answer-entry';
export async function PlayerFormPage({locale,requestId}:{locale:Locale;requestId:string}) {
  const {client,player} = await playerFormsAccess();
  if (!z.uuid().safeParse(requestId).success) notFound();
  const data = await loadRequest(client,requestId).catch(() => null);
  const t = await getT(messages, locale);
  if (!data) return <main className="p-section"><p role="alert">{t('unavailable')}</p>
    <Link href={`/${locale}/player/forms/${requestId}`} className="flex min-h-12 items-center text-lime">{t('retry')}</Link></main>;
  if (data.request.player_id !== player) notFound();
  return <main className="mx-auto max-w-lg p-card pb-32"><AnswerEntry data={data} locale={locale} /></main>;
}
