'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Sparkles, UserRound } from 'lucide-react';
import { formatDateAr } from '@/lib/dates';
import { useLocale, useT } from '@/core/i18n/client';
import { useCaptainContext } from '@/features/player-shell';
import { CycleEntry, useProgramSnapshot } from '@/features/player-home';
import dynamic from 'next/dynamic';
const PlayerBudgetEntry = dynamic(() => import('@/features/meal-plans').then(module => module.PlayerBudgetEntry));
import type { SettingsProfile } from '../schema';
import { messages } from '../player-messages';
import { messages as v6Messages } from '../v6-messages';
import { PlayerPreferences } from './player-preferences';
import { PlayerIdentity } from './player-identity';
import { PlayerStatTiles } from './player-stat-tiles';
import { ProfileWriteContext, useProfileWriter } from '../hooks/use-profile-write';

export function PlayerAccount({ profile, profileForm, children, install, signOut, onProfileSave }: {
  profile: SettingsProfile | null; profileForm: ReactNode; children?: ReactNode; install: ReactNode; signOut: ReactNode;
  onProfileSave: (profile: SettingsProfile) => void;
}) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const captain = useCaptainContext();
  const locale = useLocale();
  const accessUntil = captain.data?.accessUntil;
  const { snapshot } = useProgramSnapshot(profile?.id);
  const writer = useProfileWriter();
  const current = profile;
  return <ProfileWriteContext value={writer}><main className="mx-auto max-w-lg space-y-card-gap pb-section">
    <header className="flex items-center gap-stack">
      <Link href="/player" aria-label={t('back')} className="flex size-12 shrink-0 items-center justify-center rounded-control glass">
        <ChevronRight aria-hidden className="dir-icon size-5" />
      </Link><h1 className="font-sans text-h font-black!">{t('title')}</h1>
    </header>
    {current ? <>
      <PlayerIdentity profile={current} captainName={captain.data?.fullName}
        plan={snapshot?.title} onSave={onProfileSave} />
      {accessUntil && <section className="glass-strong cut-corner flex items-baseline justify-between gap-stack rounded-card p-card">
        <h2 className="text-sm font-bold">{t('until')}</h2>
        <time dateTime={accessUntil} className="text-end font-display text-title font-extrabold tabular-nums">
          {formatDateAr(accessUntil, { day: 'numeric', month: 'short' }, locale)}
        </time>
      </section>}
    </> : profileForm}
    <section aria-label={t('more')} className="glass overflow-hidden rounded-card">
      {current && <details className="group/edit">
        <summary className="press flex min-h-14 cursor-pointer items-center gap-stack px-card text-sm">
          <UserRound aria-hidden className="size-4 text-muted" /><span className="flex-1">{t('edit')}</span>
          <ChevronDown aria-hidden className="size-4 text-muted group-open/edit:rotate-180" />
        </summary><div className="border-t border-line-soft p-card">{profileForm}</div>
      </details>}
      {current && <PlayerPreferences units={current.units ?? 'metric'} />}
      <details className="group">
        <summary className="press flex min-h-14 cursor-pointer items-center justify-between border-t border-line-soft px-card text-sm">
          {t('more')}<ChevronDown aria-hidden className="size-4 text-muted group-open:rotate-180" />
        </summary>
        <div className="divide-y divide-line-soft border-t border-line-soft [&>div]:min-h-14">
          <div className="min-h-[60px] p-stack">{install}</div>
          <div className="divide-y divide-line-soft [&>div]:px-page-x [&>div]:py-stack [&>section]:rounded-none [&>section]:border-0 [&>section]:bg-transparent [&>section]:p-card [&>section]:shadow-none [&>button]:min-h-[60px] [&>button]:rounded-none [&>button]:bg-transparent [&>button]:px-page-x [&>button]:py-stack [&>button]:shadow-none">{children}</div>
          <div className="flex min-h-[60px] items-center gap-stack px-page-x py-stack"><Sparkles aria-hidden className="size-6 shrink-0 text-lime" />
            <span><span className="block text-sm">{v6t('ko')}</span><span className="text-xs text-muted">{t('soon')}</span></span></div>
        </div>
      </details>
    </section>
    {current && <>
      <PlayerStatTiles playerId={current.id} snapshot={snapshot} />
      <PlayerBudgetEntry />
      <CycleEntry playerId={current.id} settings />
    </>}
    <div aria-label={t('logout')} className="[&_button]:min-h-12 [&_button]:w-full [&_button]:rounded-control [&_button]:border-line! [&_button]:bg-surface! [&_button]:text-danger! [&_button]:shadow-none!">{signOut}</div>
  </main></ProfileWriteContext>;
}
