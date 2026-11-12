import 'server-only';
import Link from 'next/link';
import { notFound, unstable_rethrow } from 'next/navigation';
import { getLocale } from '@/core/i18n/server';
import { createT } from '@/core/i18n/messages';
import { readPlayerPrograms, readProgram } from '@/features/programs/server';
import { readPlayerProfile } from '../player-file/profile-data';
import { readPlayerFile } from '../player-file/read-player-file';
import { TrainingFacts } from './training-facts';
import dynamic from 'next/dynamic';
import { messages } from './messages';

const TrainingEditorEntry = dynamic(() => import('./training-editor-entry').then(module => module.TrainingEditorEntry));

export async function TrainingContent({ playerId }: { playerId: string }) {
  const locale = await getLocale(), t = createT(messages, locale);
  const [profile, programs, file] = await Promise.all([
    readPlayerProfile(playerId), readPlayerPrograms(playerId), readPlayerFile(playerId).catch(error => { unstable_rethrow(error); return null; }),
  ]);
  const retry = <div role="alert" className="glass rounded-card p-5 text-danger"><p>{t('error')}</p>
    <Link className="inline-flex min-h-12 items-center text-ink" href={`/captain/players/${playerId}/programs`}>{t('retry')}</Link></div>;
  if (profile.error || programs.error || !file) return retry;
  if (!profile.data) notFound();
  const current = programs.data?.find(row => row.status === 'draft' || row.status === 'active');
  const loaded = current ? await readProgram(current.id) : null;
  if (loaded?.error) return retry;
  return <div className="grid min-w-0 items-start gap-[18px] min-[1001px]:grid-cols-[300px_minmax(0,1fr)]">
    <TrainingFacts profile={profile.data} file={file} locale={locale} />
    <TrainingEditorEntry playerId={playerId} initial={loaded?.data ?? null} programs={programs.data ?? []} loadingLabel={t('loading')} />
  </div>;
}
