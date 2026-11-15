import { localDate } from '@/lib/dates';
import { profileTimezone } from '@/lib/timezone';
import { internationalEnabled } from '@/lib/international-enabled';
import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';

import Link from 'next/link';
import Image from 'next/image';
import { whatsappUrl } from '@/lib/whatsapp';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ProfileTabs } from './profile-tabs';
import type { ProfileTab } from '../model';
import type { ProfileResult } from '../types';
import { CheckinsTab } from './checkins-tab';
import { IntakeTab } from './intake-tab';
import { PlanTab } from './plan-tab';
import { ProgressTab } from './progress-tab';
import { AnalyticsLoader } from '@/features/muscle-analytics';
import { ReadinessLoader } from './readiness-loader';
import { BodyScansLoader } from '@/features/body-scans';
import { BillingLoader } from './billing-loader';

interface Props {
  playerId: string;
  tab: ProfileTab;
  today: string;
  data: Promise<ProfileResult>;
}

export async function ProfileScreen({ playerId, tab, today, data }: Props) {
  const [t, locale, result] = await Promise.all([getT(messages), getLocale(), data]);
  const Back = locale === 'ar' ? ArrowRight : ArrowLeft;
  const back = <Link href="/captain/players" className="inline-flex min-h-12 items-center gap-inline text-sm font-bold text-muted hover:text-ink">
    <Back aria-hidden className="size-5" />{t('backToPlayers')}
  </Link>;
  if (result.error) return <section className="space-y-card-gap">{back}<p role="alert" className="glass rounded-card p-card text-danger">{t('loadFailed')}</p></section>;
  if (!result.data) notFound();
  const profile = result.data;
  const playerToday = internationalEnabled() ? localDate(new Date(), profileTimezone(profile.timezone)) : today;
  const whatsapp = profile.phone ? whatsappUrl({ phone: profile.phone }) : null;
  return (
    <section className="space-y-section">
      {back}
      <header className="flex items-center gap-card-gap">
        {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={64} height={64} unoptimized className="size-16 shrink-0 rounded-full object-cover" /> :
          <span aria-hidden className="glass-strong grid size-16 shrink-0 place-items-center rounded-full font-display text-2xl font-extrabold">{profile.name.trim().charAt(0)}</span>}
        <div className="min-w-0">
          <p className="text-sm text-muted">{t('profile')}</p>
          <h1 className="truncate text-3xl font-extrabold">{profile.name}</h1>
        </div>
      </header>
      <BillingLoader playerId={playerId} name={profile.name} today={today} />
      {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-control border border-lime px-page-x font-bold text-lime">{t('whatsappPlayer')}</a>}
      <ProfileTabs tab={tab} t={t} />
      {tab === 'readiness' ? <ReadinessLoader playerId={playerId} today={playerToday} /> : tab === 'analysis' ? <AnalyticsLoader key={playerId} playerId={playerId} /> :
        tab === 'intake' ? <IntakeTab playerId={playerId} intake={profile.intake} today={playerToday} /> :
          tab === 'progress' ? <><BodyScansLoader playerId={playerId} /><ProgressTab playerId={playerId} checkIns={profile.checkIns} targetKg={profile.intake?.targetWeightKg ?? null} /></> :
            tab === 'plan' ? <PlanTab playerId={playerId} program={profile.program} nutrition={profile.nutrition} /> :
              <CheckinsTab playerId={playerId} checkIns={profile.checkIns} />}
    </section>
  );
}
