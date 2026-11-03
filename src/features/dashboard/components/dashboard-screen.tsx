import { getLocale, getT } from '@/core/i18n/server';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { UserPlus } from 'lucide-react';
import { GlassCard } from '@/ui';
import { lastSeenLabel, RadarCard } from '@/features/roster';
import type { RosterResult } from '@/features/roster';
import { buildAlerts, dashboardStats, recentActivity } from '../alerts';
import { PlayerFinder } from './player-finder';
import { SmartAlerts } from './smart-alerts';

interface Props {
  data: Promise<[RosterResult, string, Map<string, number>]>;
  today: string;
  plan?: ReactNode;
}

export async function DashboardScreen({ data, today, plan }: Props) {
  const [t, locale, [roster, firstName, dues]] = await Promise.all([getT(messages), getLocale(), data]);
  const header = <header className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-3xl font-extrabold">{firstName ? t('greeting', { name: firstName }) : t('greetingNoName')}</h1>
      <p className="mt-1 text-sm text-muted">{t('intro')}</p>
    </div>
    {plan}
  </header>;
  if (roster.error !== undefined) return <section className="space-y-6">{header}
    <p role="alert" className="glass rounded-card p-5 text-danger">{t('loadFailed')}</p></section>;
  const players = roster.players;
  if (players.length === 0) return <section className="space-y-6">{header}
    <GlassCard className="empty-state-in flex flex-col items-center gap-4 px-6 py-10 text-center">
      <span aria-hidden className="grid size-16 place-items-center rounded-full bg-lime-soft text-lime ring-8 ring-lime-soft"><UserPlus className="size-7" /></span>
      <h2 className="text-xl font-bold">{t('noPlayersTitle')}</h2>
      <p className="max-w-prose text-sm text-muted">{t('noPlayersBody')}</p>
      <Link href="/captain/players" className="inline-flex min-h-12 items-center rounded-control bg-lime px-5 font-extrabold text-on-lime">{t('goToPlayers')}</Link>
    </GlassCard>
  </section>;

  const stats = dashboardStats(players, today);
  const cards = [
    { label: t('active'), value: stats.active, color: 'text-lime' },
    { label: t('late'), value: stats.late, color: 'text-warn' },
    { label: t('pendingTasks'), value: stats.tasks, color: 'text-ink' },
    { label: t('endingSoon'), value: stats.ending, color: 'text-danger' },
  ];
  const finder = (rows: typeof players) => rows.map((player) => ({ playerId: player.playerId, fullName: player.fullName,
    programTitle: player.programTitle, lastSeen: lastSeenLabel(player.lastTrainingDate, today, locale) }));
  return (
    <section className="space-y-6">
      {header}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, color }) => <GlassCard key={label} level="strong" className="space-y-2 p-5">
          <p className="text-sm text-muted">{label}</p>
          <p className={`font-display text-4xl font-extrabold ${color}`}>{formatNumber(value, locale)}</p>
        </GlassCard>)}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <RadarCard today={today} showEmpty />
          <SmartAlerts alerts={buildAlerts(players, dues, today)} />
        </div>
        <PlayerFinder players={finder(players)} recent={finder(recentActivity(players))} />
      </div>
    </section>
  );
}
