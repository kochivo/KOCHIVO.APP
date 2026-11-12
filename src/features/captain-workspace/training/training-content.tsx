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
import type { ProgramDraft } from '@/features/programs';
import { loadSummary } from '../player-file/load-summary';
import { PlanContext } from '../player-file/plan-context';
import { TimezoneScope } from '@/core/timezone/timezone-scope';
import { getPlayerTimezone, getTimezone } from '@/core/timezone/server';
import { localDate, daysBetween } from '@/lib/dates';

const TrainingEditorEntry = dynamic(() => import('./training-editor-entry').then(module => module.TrainingEditorEntry));

export async function TrainingContent({ playerId, initial }: { playerId: string; initial?: ProgramDraft }) {
  const locale = await getLocale(), t = createT(messages, locale);
  const [profile, programs, file] = await Promise.all([
    readPlayerProfile(playerId), readPlayerPrograms(playerId), readPlayerFile(playerId).catch(error => { unstable_rethrow(error); return null; }),
  ]);
  const retry = <div role="alert" className="glass rounded-card p-5 text-danger"><p>{t('error')}</p>
    <Link className="inline-flex min-h-12 items-center text-ink" href={`/captain/players/${playerId}/programs`}>{t('retry')}</Link></div>;
  if (profile.error || programs.error || !file) return retry;
  if (!profile.data) notFound();
  const current = programs.data?.find(row => row.status === 'draft' || row.status === 'active');
  const loaded = initial ? { data: initial } : current ? await readProgram(current.id) : null;
  if (loaded?.error) return retry;
  const timezone = profile.data.timezone ?? await getPlayerTimezone(playerId);
  const today = localDate(new Date(), await getTimezone());
  const summary = await loadSummary(playerId, localDate(new Date(), timezone)).catch(error => { unstable_rethrow(error); return null; });
  if (!summary) return retry;
  const subscription = summary.subscription;
  const remaining = daysBetween(today, subscription.access_until);
  return <TimezoneScope timezone={timezone}><div className="min-w-0 space-y-[18px]">
    <TrainingEditorEntry key={loaded?.data?.id ?? playerId} playerId={playerId} playerName={profile.data.name}
      remainingDays={remaining >= 0 && !subscription.pending && !subscription.frozen_at ? remaining : undefined}
      initial={loaded?.data ?? null} programs={programs.data ?? []} loadingLabel={t('loading')}
      facts={<TrainingFacts profile={profile.data} file={file} locale={locale} />} />
    <PlanContext profile={profile.data} locale={locale} kind="training" timezone={timezone} />
  </div></TimezoneScope>;
}
