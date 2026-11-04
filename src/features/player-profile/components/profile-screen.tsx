import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { profileTabs } from '../model';
import type { ProfileTab } from '../model';
import type { ProfileResult } from '../types';
import { CheckinsTab } from './checkins-tab';
import { IntakeTab } from './intake-tab';
import { PlanTab } from './plan-tab';
import { ProgressTab } from './progress-tab';
import { AnalyticsLoader } from '@/features/muscle-analytics';

interface Props {
  playerId: string;
  tab: ProfileTab;
  today: string;
  data: Promise<ProfileResult>;
}

export async function ProfileScreen({ playerId, tab, today, data }: Props) {
  const [t, locale, result] = await Promise.all([getT(messages), getLocale(), data]);
  const Back = locale === 'ar' ? ArrowRight : ArrowLeft;
  const back = <Link href="/captain/players" className="inline-flex min-h-12 items-center gap-2 text-sm font-bold text-muted hover:text-ink">
    <Back aria-hidden className="size-5" />{t('backToPlayers')}
  </Link>;
  if (result.error) return <section className="space-y-4">{back}<p role="alert" className="glass rounded-card p-5 text-danger">{t('loadFailed')}</p></section>;
  if (!result.data) notFound();
  const profile = result.data;
  return (
    <section className="space-y-6">
      {back}
      <header className="flex items-center gap-4">
        <span aria-hidden className="glass-strong grid size-16 shrink-0 place-items-center rounded-full font-display text-2xl font-extrabold">{profile.name.trim().charAt(0)}</span>
        <div className="min-w-0">
          <p className="text-sm text-muted">{t('profile')}</p>
          <h1 className="truncate text-3xl font-extrabold">{profile.name}</h1>
        </div>
      </header>
      <nav aria-label={t('tabs')} className="glass flex gap-1 overflow-x-auto rounded-control p-1">
        {profileTabs.map((key) => <Link key={key} href={`?tab=${key}`} scroll={false} aria-current={key === tab ? 'page' : undefined}
          className={cn('flex min-h-12 flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-control px-4 text-sm font-bold transition-colors duration-150 motion-reduce:transition-none',
            key === tab ? 'bg-lime text-on-lime' : 'text-muted hover:bg-ink/5 hover:text-ink')}>{t(`tab.${key}`)}</Link>)}
      </nav>
      {tab === 'analysis' ? <AnalyticsLoader key={playerId} playerId={playerId} /> :
        tab === 'intake' ? <IntakeTab playerId={playerId} intake={profile.intake} today={today} /> :
          tab === 'progress' ? <ProgressTab playerId={playerId} checkIns={profile.checkIns} targetKg={profile.intake?.targetWeightKg ?? null} /> :
            tab === 'plan' ? <PlanTab playerId={playerId} program={profile.program} nutrition={profile.nutrition} /> :
              <CheckinsTab playerId={playerId} checkIns={profile.checkIns} />}
    </section>
  );
}
