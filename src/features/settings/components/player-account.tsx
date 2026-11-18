'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, CreditCard, Pencil, Shield, Sparkles } from 'lucide-react';
import { formatDateAr } from '@/lib/dates';
import { useLocale, useT } from '@/core/i18n/client';
import { useCaptainContext } from '@/features/player-shell';
import { useProgramSnapshot } from '@/features/player-home';
import dynamic from 'next/dynamic';
import { Button } from '@/ui/button';
const CycleEntry = dynamic(() => import('@/features/player-home').then(module => module.CycleEntry));
const PlayerBudgetEntry = dynamic(() => import('@/features/meal-plans').then(module => module.PlayerBudgetEntry));
import type { SettingsProfile } from '../schema';
import { messages } from '../player-messages';
import { messages as v6Messages } from '../v6-messages';
import { PlayerPreferences } from './player-preferences';
import { PlayerIdentity } from './player-identity';
import { PlayerStatTiles } from './player-stat-tiles';
import { ProfileWriteContext, useProfileWriter } from '../hooks/use-profile-write';
import css from './player-account.module.css';

export function PlayerAccount({ profile, profileForm, children, privacy, install, signOut, connectedTools, onProfileSave }: {
  profile: SettingsProfile | null; profileForm: ReactNode; children?: ReactNode; privacy?: ReactNode; install: ReactNode; signOut: ReactNode;
  connectedTools?: ReactNode; onProfileSave: (profile: SettingsProfile) => void;
}) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const captain = useCaptainContext();
  const locale = useLocale();
  const accessUntil = captain.data?.accessUntil;
  const { snapshot } = useProgramSnapshot(profile?.id);
  const writer = useProfileWriter();
  const [editing, setEditing] = useState(false);
  const editor = useId();
  const current = profile;
  return <ProfileWriteContext value={writer}><div className={`${css.account} mx-auto max-w-lg space-y-card-gap`}>
    <header className="flex items-center gap-stack">
      <Link href="/player" aria-label={t('back')} className="flex size-12 shrink-0 items-center justify-center rounded-control glass">
        <ChevronLeft aria-hidden className="dir-icon size-5" />
      </Link><h1 className="font-sans text-h font-black!">{t('title')}</h1>
    </header>
    {current ? <>
      <PlayerIdentity profile={current} captainName={captain.data?.fullName} plan={snapshot?.title} onSave={onProfileSave}
        action={<Button variant="secondary" block={false} aria-expanded={editing} aria-controls={editor}
          className="shrink-0 gap-inline px-stack text-xs" onClick={() => setEditing(value => !value)}>
          <Pencil aria-hidden className="size-4" />{t('editShort')}
        </Button>}>
        <div id={editor} hidden={!editing} className="mt-card-gap border-t border-line-soft pt-card">{profileForm}</div>
      </PlayerIdentity>
    </> : profileForm}
    {current && <PlayerPreferences units={current.units ?? 'metric'} />}
    {(accessUntil || privacy) && <section className="glass divide-y divide-line-soft overflow-hidden rounded-card">
      {accessUntil && <Link href={`/${locale}/player/captain/profile`} className="press flex min-h-14 items-center gap-stack px-card">
        <CreditCard aria-hidden className="size-5 shrink-0 text-muted" />
        <span className="flex-1 text-sm font-bold">{t('subscription')}</span>
        <time dateTime={accessUntil} aria-label={t('until')} className="text-xs text-muted">
          {formatDateAr(accessUntil, { day: 'numeric', month: 'short' }, locale)}
        </time><ChevronLeft aria-hidden className="dir-icon size-4 shrink-0 text-muted" />
      </Link>}
      {privacy && <details className="group/privacy">
        <summary className="press flex min-h-14 cursor-pointer items-center gap-stack px-card text-sm font-bold">
          <Shield aria-hidden className="size-5 text-muted" /><span className="flex-1">{t('privacy')}</span>
          <ChevronDown aria-hidden className="size-4 text-muted group-open/privacy:rotate-180" />
        </summary><div className="divide-y divide-line-soft border-t border-line-soft [&>section]:rounded-none [&>section]:p-card [&>section]:shadow-none">{privacy}</div>
      </details>}
    </section>}
    <section aria-label={t('more')} className="glass overflow-hidden rounded-card">
      <details className="group">
        <summary className="press flex min-h-14 cursor-pointer items-center justify-between px-card text-sm">
          {t('more')}<ChevronDown aria-hidden className="size-4 text-muted group-open:rotate-180" />
        </summary>
        <div className="divide-y divide-line-soft border-t border-line-soft [&>div]:min-h-14">
          <div className="min-h-[60px] p-stack">{install}</div>
          <div className="divide-y divide-line-soft [&>div]:px-page-x [&>div]:py-stack [&>section]:rounded-none [&>section]:border-0 [&>section]:bg-transparent [&>section]:p-card [&>section]:shadow-none [&>button]:min-h-[60px] [&>button]:rounded-none [&>button]:bg-transparent [&>button]:px-page-x [&>button]:py-stack [&>button]:shadow-none">{children}</div>
          <div className="flex min-h-[60px] items-center gap-stack px-page-x py-stack"><Sparkles aria-hidden className="size-6 shrink-0 text-lime" />
            <span><span className="block text-sm">{v6t('ko')}</span><span className="text-xs text-muted">{t('soon')}</span></span></div>
        </div>
        {current && <div className="space-y-card-gap border-t border-line-soft p-card">
          <PlayerStatTiles playerId={current.id} snapshot={snapshot} />
          <PlayerBudgetEntry />
          <CycleEntry playerId={current.id} settings />
        </div>}
      </details>
    </section>
    {connectedTools}
    <div aria-label={t('logout')} className="[&_button]:min-h-12 [&_button]:w-full [&_button]:rounded-control [&_button]:border-line! [&_button]:bg-surface! [&_button]:text-danger! [&_button]:shadow-none!">{signOut}</div>
  </div></ProfileWriteContext>;
}
