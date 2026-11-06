import { getLocale, getT } from '@/core/i18n/server';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import type { ReactNode } from 'react';
import { GlassCard } from '@/ui';
import { lastSeenLabel, RadarCard } from '@/features/roster';
import type { RosterResult } from '@/features/roster';
import { buildAlerts, dashboardStats, recentActivity } from '../alerts';
import { PlayerFinder } from './player-finder';
import { SmartAlerts } from './smart-alerts';
import { captainNextTasks } from '../next-task';
import { NextTaskCard } from './next-task-card';
import { StartStepsCard } from './start-steps-card';

interface Props {
  data: Promise<[RosterResult, string, Map<string, number>]>;
  today: string;
  plan?: ReactNode;
  joinRequests?: ReactNode;
  coachLink?: ReactNode;
}

export async function DashboardScreen({ data, today, plan, joinRequests, coachLink }: Props) {
  const [t, locale, [roster, firstName, dues]] = await Promise.all([getT(messages), getLocale(), data]);
  const header = <header className="flex flex-wrap items-end justify-between gap-4">
    <div className="lg:min-w-0">
      <h1 className="text-3xl font-extrabold lg:truncate">{firstName ? t('greeting', { name: firstName }) : t('greetingNoName')}</h1>
      <p className="mt-1 text-sm text-muted">{t('intro')}</p>
    </div>
    <div className="min-w-0 lg:hidden">{plan}</div>
  </header>;
  if (roster.error !== undefined) return <section data-tour-ready="true" className="space-y-6">{header}
    <p role="alert" className="glass rounded-card p-5 text-danger">{t('loadFailed')}</p></section>;
  const players = roster.players;
  const tasks = captainNextTasks(players, dues, today);

  const stats = dashboardStats(players, today);
  const cards = [
    { label: t('active'), value: stats.active, color: 'text-ink' },
    { label: t('late'), value: stats.late, color: 'text-warn' },
    { label: t('pendingTasks'), value: stats.tasks, color: 'text-ink' },
    { label: t('endingSoon'), value: stats.ending, color: 'text-danger' },
  ];
  const finder = (rows: typeof players) => rows.map((player) => ({ playerId: player.playerId, fullName: player.fullName,
    programTitle: player.programTitle, lastSeen: lastSeenLabel(player.lastTrainingDate, today, locale) }));
  return (
    <section data-tour-ready="true" className="space-y-6">
      {header}
      {players.length > 0 && <NextTaskCard tasks={tasks} captainFirstName={firstName} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, color }) => <GlassCard key={label} level="strong" className="min-w-0 space-y-2 p-5">
          <p className="text-sm text-muted">{label}</p>
          <p className={`font-display text-4xl font-extrabold ${color}`}>{formatNumber(value, locale)}</p>
        </GlassCard>)}
      </div>
      {players.length === 0 ? <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <StartStepsCard captainFirstName={firstName} />
        <div className="min-w-0 space-y-6">{coachLink}{joinRequests}</div>
      </div> : <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-6">
          <RadarCard today={today} showEmpty />
          <SmartAlerts alerts={buildAlerts(players, dues, today)} />
        </div>
        <div className="min-w-0 space-y-6">
          {joinRequests}
          <PlayerFinder players={finder(players)} recent={finder(recentActivity(players))} />
        </div>
      </div>}
    </section>
  );
}
