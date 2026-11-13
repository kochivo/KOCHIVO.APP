import type { ReactNode } from 'react';
import { notFound, unstable_rethrow } from 'next/navigation';
import { getPlayerTimezone } from '@/core/timezone/server';
import { getTimezone } from '@/core/timezone/server';
import { TimezoneScope } from '@/core/timezone/timezone-scope';
import type { Locale } from '@/core/i18n/locale';
import { localDate } from '@/lib/dates';
import { currentClaims } from '@/core/supabase/claims';
import { supabaseServer } from '@/core/supabase/server';
import { unreadCounts } from '@/features/chat/server';
import { FileChatEntry } from './chat-entry';
import { readPlayerProfile } from './profile-data';
import { loadSummary } from './load-summary';
import { FileState } from './file-state';
import { FileHeader } from './file-header';
import { PlayerOverview } from './overview';
import { PlayerCheckins } from './checkins';
import { PlayerAssessmentsEntry } from './assessments-entry';
import { FileSupplementsEntry } from './supplements-entry';
import { PlanContext } from './plan-context';
import type { PlayerFileTab } from './types';

export async function FileContent({ playerId, tab, locale, children }: {
  playerId: string; tab: PlayerFileTab; locale: Locale; children?: ReactNode;
}) {
  const result = await readPlayerProfile(playerId);
  const href = `/captain/players/${playerId}${tab === 'overview' ? '' : `/${tab === 'training' ? 'programs' : tab}`}`;
  if (result.error) return <FileState error locale={locale} href={href} />;
  if (!result.data) notFound();
  const profile = result.data;
  const timezone = profile.timezone ?? await getPlayerTimezone(playerId);
  const today = localDate(new Date(), timezone);
  const captainToday = localDate(new Date(), await getTimezone());
  let summary;
  let captainId: string;
  let counts: Record<string, number>;
  try {
    const claims = await currentClaims();
    if (claims.error || !claims.data?.claims.sub) throw new Error('Unauthenticated');
    captainId = claims.data.claims.sub;
    [summary, counts] = await Promise.all([loadSummary(playerId, today), unreadCounts(await supabaseServer(), captainId)
      // The tab count is secondary; a chat failure must not hide the whole player file.
      .catch((error: unknown) => { console.warn('Chat counts unavailable', error); return {}; })]);
  }
  catch (error) { unstable_rethrow(error); return <FileState error locale={locale} href={href} />; }
  return <TimezoneScope timezone={timezone}><section className="min-w-0 space-y-[18px]">
    <FileHeader playerId={playerId} profile={profile} summary={summary} tab={tab} locale={locale} today={captainToday} playerToday={today} unreadCount={counts[playerId] ?? 0} />
    {tab === 'overview' ? <PlayerOverview playerId={playerId} profile={profile} summary={summary} locale={locale} today={today} /> :
      tab === 'chat' ? <FileChatEntry playerId={playerId} captainId={captainId} playerName={profile.name} /> :
      tab === 'checkins' ? <PlayerCheckins playerId={playerId} profile={profile} today={today} locale={locale} /> :
        tab === 'assessments' ? <PlayerAssessmentsEntry playerId={playerId} locale={locale} /> :
          tab === 'training' ? <>{children}
            <PlanContext profile={profile} locale={locale} kind="training" timezone={timezone} /></> : <>
            {children}<PlanContext profile={profile} locale={locale} kind="nutrition" timezone={timezone} /><FileSupplementsEntry playerId={playerId} />
          </>}
  </section></TimezoneScope>;
}
