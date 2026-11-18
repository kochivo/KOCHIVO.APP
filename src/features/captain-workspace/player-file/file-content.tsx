import type { ReactNode } from 'react';
import { notFound, unstable_rethrow } from 'next/navigation';
import { getPlayerTimezone } from '@/core/timezone/server';
import { getTimezone } from '@/core/timezone/server';
import { TimezoneScope } from '@/core/timezone/timezone-scope';
import type { Locale } from '@/core/i18n/locale';
import { getArabicStyle } from '@/core/i18n/server';
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
import { FileSupplementsEntry } from './supplements-entry';
import { PlanContext } from './plan-context';
import type { PlayerFileTab } from './types';
import { loadActivity } from './load-activity';
import { NutritionSummary } from './nutrition-summary';
import { loadPlayerRequests } from '@/features/forms/server';
import { AssessmentCards } from './assessment-cards';
import { NewAssessmentEntry } from './new-assessment-entry';
import { AssessmentReviewEntry } from './assessment-review-entry';
import { MoneyOwedEntry } from '../money-owed/money-owed-entry';
import { PainReportsEntry } from '../components/pain-reports-entry';
import { PhoneOverview } from './phone-overview';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

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
  let activity;
  let assessments;
  try {
    const claims = await currentClaims();
    if (claims.error || !claims.data?.claims.sub) throw new Error('Unauthenticated');
    captainId = claims.data.claims.sub;
    [summary, counts] = await Promise.all([loadSummary(playerId, today), unreadCounts(await supabaseServer(), captainId)
      // The tab count is secondary; a chat failure must not hide the whole player file.
      .catch((error: unknown) => { console.warn('Chat counts unavailable', error); return {}; })]);
    if (tab === 'overview' || tab === 'nutrition') activity = await loadActivity(playerId, today);
    if (tab === 'assessments') assessments = await loadPlayerRequests(await supabaseServer(), playerId);
  }
  catch (error) { unstable_rethrow(error); return <FileState error locale={locale} href={href} />; }
  const phone = captainWorkspaceEnabled();
  return <TimezoneScope timezone={timezone}><section className="min-w-0 space-y-stack">
    <FileHeader playerId={playerId} profile={profile} summary={summary} tab={tab} locale={locale} today={captainToday} playerToday={today} unreadCount={counts[playerId] ?? 0} />
    {phone && tab === 'overview' && activity && <PhoneOverview summary={summary} profile={profile} activity={activity}
      today={today} locale={locale} style={locale === 'ar' ? await getArabicStyle() : 'egyptian'} />}
    <PainReportsEntry playerId={playerId} />
    {tab === 'overview' && <MoneyOwedEntry mode="player" playerId={playerId} />}
    {tab === 'overview' && activity ? <PlayerOverview playerId={playerId} profile={profile} summary={summary} locale={locale} today={today} activity={activity} /> :
      tab === 'chat' ? <FileChatEntry playerId={playerId} captainId={captainId} playerName={profile.name} /> :
      tab === 'checkins' ? <PlayerCheckins playerId={playerId} profile={profile} today={today} locale={locale} /> :
        tab === 'assessments' ? <div className="grid gap-stack min-[760px]:grid-cols-2">
          <AssessmentCards requests={assessments ?? []} locale={locale} timezone={timezone} playerId={playerId} /><NewAssessmentEntry playerId={playerId} locale={locale} />
          <AssessmentReviewEntry playerId={playerId} locale={locale} />
        </div> :
          tab === 'training' ? <>{children}
            <PlanContext profile={profile} locale={locale} kind="training" timezone={timezone} /></> : <>
            {activity && <NutritionSummary activity={activity} locale={locale}>{children}<FileSupplementsEntry playerId={playerId} /></NutritionSummary>}
          </>}
  </section></TimezoneScope>;
}
