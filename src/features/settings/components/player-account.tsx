'use client';

import type { ReactNode } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { useCaptainContext } from '@/features/player-shell';
import { daysBetween, localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import type { SettingsProfile } from '../schema';
import { messages } from '../v6-messages';
import { PlayerPreferences } from './player-preferences';

export function PlayerAccount({ profile, profileForm, children, install, signOut }: {
  profile: SettingsProfile | null; profileForm: ReactNode; children: ReactNode; install: ReactNode; signOut: ReactNode;
}) {
  const t = useT(messages);
  const captain = useCaptainContext();
  const timezone = useTimezone();
  const { now } = useCalendarClock();
  const days = now && captain.data ? Math.max(0, daysBetween(localDate(now, timezone), captain.data.accessUntil)) : null;
  return <main className="mx-auto max-w-lg space-y-3">
    <h1 className="mb-4 font-display text-2xl font-semibold">{t('title')}</h1>
    {profile ? <details className="glass rounded-card border border-line-soft p-5">
      <summary className="flex min-h-12 cursor-pointer items-center gap-3">
        <span className="glass grid size-[52px] shrink-0 place-items-center rounded-full border border-line-soft text-lg">{profile?.full_name.slice(0, 1)}</span>
        <span><span className="block">{profile?.full_name}</span>
          {captain.data && days !== null && <span className="mt-1 block text-xs text-faint">{t('coach', { name: captain.data.fullName, n: days })}</span>}</span>
      </summary><div className="mt-4">{profileForm}</div>
    </details> : profileForm}
    {profile && <PlayerPreferences units={profile.units ?? 'metric'} />}
    <section className="glass divide-y divide-line-soft rounded-card border border-line-soft">
      <div className="flex min-h-16 items-center gap-3 px-5 py-3"><Bell aria-hidden className="size-5 text-muted" />
        <div><p>{t('reminder')}</p><p className="mt-1 text-xs text-faint">{t('reminderInfo')}</p></div></div>
      <div className="p-3">{install}</div><div className="p-3" aria-label={t('logout')}>{signOut}</div>
    </section>
    <section className="glass flex items-center gap-3 rounded-card border border-line-soft p-5">
      <Sparkles aria-hidden className="size-6 text-lime" /><div><p>{t('ko')}</p><p className="mt-1 text-xs text-faint">{t('soon')}</p></div>
    </section>
    <details className="glass rounded-card border border-line-soft p-5"><summary className="min-h-12 cursor-pointer">{t('more')}</summary><div className="space-y-4">{children}</div></details>
  </main>;
}
