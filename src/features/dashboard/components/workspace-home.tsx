import 'server-only';
import type { ReactNode } from 'react';
import { getLocale, getT } from '@/core/i18n/server';
import { InviteButton, lastSeenLabel, RadarCard } from '@/features/roster';
import type { RosterResult } from '@/features/roster';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { loadHomeSummary } from '../data/workspace';
import { activePlayerCount } from '../workspace-maths';
import { buildAlerts, dashboardStats, recentActivity } from '../alerts';
import { captainNextTasks } from '../next-task';
import { workspaceMessages } from '../workspace-messages';
import { PlayerFinder } from './player-finder';
import { SmartAlerts } from './smart-alerts';
import { StartStepsCard } from './start-steps-card';
import { WorkspaceTasks } from './workspace-tasks';
import { WorkspaceActivity } from './workspace-activity';
import { WorkspaceError } from './workspace-error';

export async function WorkspaceHome({ data, today, plan, coachLink, joinRequests }: {
  data: Promise<[RosterResult, string, Map<string, number>]>; today: string;
  plan?: ReactNode; coachLink?: ReactNode; joinRequests?: ReactNode;
}) {
  const [t, locale, [roster, firstName, dues]] = await Promise.all([getT(workspaceMessages), getLocale(), data]);
  const header = <header className="flex flex-wrap items-center justify-between gap-3.5">
    <div><p className="mb-1 text-xs text-faint">{t('date', { weekday: formatDateAr(today, { weekday: 'long' }, locale), date: formatDateAr(today, { day: 'numeric', month: 'long' }, locale) })}</p>
      <h1 className="font-display text-[30px] font-semibold leading-tight">{t('greeting', { name: firstName })}</h1></div>
    <InviteButton captainFirstName={firstName} label={t('invite')} className="min-h-12 w-auto! rounded-full border border-line bg-transparent! bg-none! font-medium! text-ink! shadow-none!" />
  </header>;
  if (roster.error) return <section className="space-y-[18px]">{header}<WorkspaceError /></section>;
  const players = roster.players ?? [];
  if (!players.length) return <section data-tour-ready="true" className="space-y-[18px]">{header}
    <StartStepsCard captainFirstName={firstName} title={t('first')} />
    <details className="glass rounded-card p-5"><summary className="min-h-12 cursor-pointer">{t('tools')}</summary>{coachLink}{joinRequests}{plan}</details>
  </section>;
  const summary = await loadHomeSummary(new Date()).catch(() => null);
  const taskPlayers = players.map(player => ({ ...player, openTasks: player.openTasks + (summary?.assessments.get(player.playerId) ?? 0) }));
  const stats = dashboardStats(players.filter(player => !player.pending && !player.frozenAt), today);
  const finder = (rows: typeof players) => rows.map(player => ({ playerId: player.playerId, fullName: player.fullName,
    programTitle: player.programTitle, lastSeen: lastSeenLabel(player.lastTrainingDate, player.playerToday ?? today, locale) }));
  const tiles = [{ key: 'active', value: activePlayerCount(players, today), hint: summary?.limit == null ? null : t('limit', { count: summary.limit }) },
    { key: 'adherence', value: summary?.adherence, hint: null }, { key: 'pending', value: taskPlayers.reduce((sum, player) => sum + player.openTasks, 0), hint: null },
    { key: 'paid', value: summary?.paid, hint: t('currency') }] as const;
  return <section data-tour-ready="true" className="space-y-[18px]">
    {header}
    {!summary && <WorkspaceError />}
    <div className="grid grid-cols-2 gap-3 min-[1001px]:grid-cols-4">{tiles.map(tile => <div key={tile.key} className="glass-strong min-w-0 rounded-card border border-line-soft px-4 py-3.5">
      <p className="text-xs text-faint">{t(tile.key)}</p><p className="my-1.5 font-display text-[22px] font-extrabold tabular-nums">
        {tile.value == null ? t('unavailable') : formatNumber(tile.value, locale)}{tile.key === 'adherence' && tile.value != null ? '%' : ''}
        {tile.hint && <small className="ms-2 text-xs font-medium text-faint">{tile.hint}</small>}</p>
      {tile.key === 'adherence' && summary && <div role="progressbar" aria-label={t('adherence')} aria-valuenow={summary.adherence} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-lime" style={{ width: `${summary.adherence}%` }} /></div>}
    </div>)}</div>
    <div className="grid items-start gap-3.5 min-[1001px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <WorkspaceTasks players={taskPlayers} lastPayments={summary?.lastPayments} tasks={captainNextTasks(taskPlayers, dues, today, summary ? { mealPlanPlayers: summary.mealPlanPlayers } : { mealPlanPlayers: new Set(players.map(player => player.playerId)) })} />
      <WorkspaceActivity events={summary?.activity ?? []} />
    </div>
    <details className="glass rounded-card border border-line-soft p-5"><summary className="min-h-12 cursor-pointer text-sm text-muted">{t('tools')}</summary>
      <dl className="mb-4 grid grid-cols-2 gap-3">{([{ label: 'lateCount', value: stats.late }, { label: 'endingCount', value: stats.ending }] as const).map(stat =>
        <div key={stat.label} className="glass-strong rounded-card p-4"><dt className="text-xs text-faint">{t(stat.label)}</dt><dd className="mt-2 font-display text-[22px] font-extrabold">{formatNumber(stat.value, locale)}</dd></div>)}</dl>
      <div className="grid gap-4 pt-3 lg:grid-cols-2"><div className="space-y-4"><RadarCard today={today} showEmpty /><SmartAlerts alerts={buildAlerts(players, dues, today)} /></div>
        <div className="space-y-4"><PlayerFinder players={finder(players)} recent={finder(recentActivity(players))} />{coachLink}{joinRequests}{plan}</div></div>
    </details>
  </section>;
}
