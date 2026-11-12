import type { Locale } from '@/core/i18n/locale';
import type { FileSummary, Profile } from './types';
import { StatusCards } from './status-cards';
import { OverviewFacts } from './overview-facts';
import { ProgressSummary } from './progress-summary';
import { ProfileSection } from './profile-section';

export function PlayerOverview({ playerId, profile, summary, locale, today }: {
  playerId: string; profile: Profile; summary: FileSummary; locale: Locale; today: string;
}) {
  return <div className="space-y-[18px]">
    <StatusCards playerId={playerId} profile={profile} summary={summary} locale={locale} today={today} />
    <div className="grid items-start gap-[18px] min-[1001px]:grid-cols-2">
      <OverviewFacts profile={profile} summary={summary} locale={locale} />
      <ProgressSummary profile={profile} summary={summary} locale={locale} />
    </div>
    {!profile.intake && <ProfileSection playerId={playerId} profile={profile} today={today} tab="intake" />}
    <ProfileSection playerId={playerId} profile={profile} today={today} tab="progress" />
  </div>;
}
