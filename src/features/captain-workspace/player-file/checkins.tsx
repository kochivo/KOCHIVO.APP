import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { ProfileSection } from './profile-section';
import type { Profile } from './types';
import { messages } from './messages';

export function PlayerCheckins({ playerId, profile, today, locale }: { playerId: string; profile: Profile; today: string; locale: Locale }) {
  const t = createT(messages, locale);
  return <div className="space-y-[18px]">
    <ProfileSection playerId={playerId} profile={profile} today={today} tab="checkins" />
    <section id="analysis" className="glass space-y-4 rounded-card border border-line-soft p-5">
      <h2 className="font-display text-[19px] font-semibold">{t('analysis')}</h2>
      <ProfileSection playerId={playerId} profile={profile} today={today} tab="analysis" />
    </section>
    <section id="readiness" className="glass space-y-4 rounded-card border border-line-soft p-5">
      <h2 className="font-display text-[19px] font-semibold">{t('readiness')}</h2>
      <ProfileSection playerId={playerId} profile={profile} today={today} tab="readiness" />
    </section>
  </div>;
}
