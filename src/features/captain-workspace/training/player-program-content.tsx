import 'server-only';
import { notFound } from 'next/navigation';
import { getLocale } from '@/core/i18n/server';
import { TimezoneScope } from '@/core/timezone/timezone-scope';
import { FileHeader } from '../player-file/file-header';
import { FileState } from '../player-file/file-state';
import { PlayerProgramSummaryEntry } from './player-program-summary-entry';
import { loadPlayerProgram } from './data/load-player-program';

export async function PlayerProgramContent({ playerId, now = new Date() }: { playerId: string; now?: Date }) {
  const locale = await getLocale(), href = `/captain/players/${playerId}/programs`;
  const result = await loadPlayerProgram(playerId, now);
  if ('error' in result) return <FileState error locale={locale} href={href} />;
  if ('missing' in result) notFound();
  const { profile, summary, timezone, today, captainToday, program, draftId } = result.data;
  return <TimezoneScope timezone={timezone}><section className="min-w-0 space-y-stack">
    <FileHeader playerId={playerId} profile={profile} summary={summary} tab="training" locale={locale} today={captainToday} playerToday={today} />
    <PlayerProgramSummaryEntry playerId={playerId} program={program} draftId={draftId} today={today} locale={locale} />
  </section></TimezoneScope>;
}
