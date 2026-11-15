import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { ProfileSection } from './profile-section';
import type { Profile } from './types';
import { messages } from './messages';
import { Disclosure } from '@/ui/disclosure';

export function PlayerCheckins({ playerId, profile, today, locale }: { playerId: string; profile: Profile; today: string; locale: Locale }) {
  const t = createT(messages, locale);
  return <div className="space-y-[18px]">
    <ProfileSection playerId={playerId} profile={profile} today={today} tab="checkins" />
    <Disclosure id="analysis" label={t('analysis')} className="glass rounded-card border-line-soft">
      <ProfileSection playerId={playerId} profile={profile} today={today} tab="analysis" />
    </Disclosure>
    <Disclosure id="readiness" label={t('readiness')} className="glass rounded-card border-line-soft">
      <ProfileSection playerId={playerId} profile={profile} today={today} tab="readiness" />
    </Disclosure>
  </div>;
}
