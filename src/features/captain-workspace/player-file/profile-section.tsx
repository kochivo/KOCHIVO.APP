import { messages } from './messages';
import { getLocale, getT } from '@/core/i18n/server';
import { DeferredSectionEntry } from './deferred-section-entry';
import { ProgressHistory } from './progress-history';
import { CheckinList } from './checkin-list';
import { FileReminder } from './reminder';
import type { Profile } from './types';

export async function ProfileSection({ playerId, profile, today, tab }: {
  playerId: string; profile: Profile; today: string; tab: 'intake' | 'progress' | 'checkins' | 'analysis' | 'readiness';
}) {
  const [locale, t] = await Promise.all([getLocale(), getT(messages)]);
  if (tab === 'intake') return <FileReminder playerId={playerId} locale={locale} title={t('noIntakeTitle')} body={t('noIntakeBody')} />;
  if (tab === 'progress') return <ProgressHistory playerId={playerId} profile={profile} locale={locale} today={today} />;
  if (tab === 'checkins') return <CheckinList playerId={playerId} profile={profile} locale={locale} />;
  return <div className="min-w-0 [&_.glass]:border [&_.glass]:border-line-soft"><DeferredSectionEntry kind={tab} playerId={playerId} today={today} /></div>;
}
