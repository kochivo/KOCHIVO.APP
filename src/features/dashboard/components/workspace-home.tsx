import 'server-only';
import type { ReactNode } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { getLocale, getT } from '@/core/i18n/server';
import { getTimezone } from '@/core/timezone/server';
import { listRenewalRequests } from '@/features/billing';
import type { RosterPlayer, RosterResult } from '@/features/roster';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { formatDateAr, localDate, saturdayWeek } from '@/lib/dates';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { loadHomeSummary } from '../data/workspace';
import { loadHomeFollowup } from '../data/home-followup';
import { loadHomeContacts } from '../data/home-contacts';
import { greetingPeriod } from '../home/model';
import { buildHomeTasks, taskProgress, trainingToday } from '../home/tasks';
import { homeMessages } from '../home/messages';
import { HomeInvite } from '../home/home-invite';
import { HomeHero } from '../home/home-hero';
import { HomeTiles } from '../home/home-tiles';
import { HomeTaskList } from '../home/home-task-list';
import { HomeWeekChart } from '../home/home-week-chart';
import { HomeConfirmations } from '../home/home-confirmations';
import { WorkspaceError } from './workspace-error';
import { MoneyOwedEntry, loadTasks } from '@/features/captain-workspace/server';
import { lastSeenLabel } from '@/features/roster';
import { buildAlerts, recentActivity } from '../alerts';
import { PlayerFinder } from './player-finder';
import { SmartAlerts } from './smart-alerts';
import { WorkspaceActivity } from './workspace-activity';
import { HomeStart } from '../home/home-start';

async function readHome<T>(read: Promise<T>) {
  try { return await read; } catch (error) { unstable_rethrow(error); return null; }
}

export async function WorkspaceHome({ data, now = new Date() }: {
  data: Promise<[RosterResult, string, Map<string, number>]>; today: string; now?: Date;
  plan?: ReactNode; coachLink?: ReactNode; joinRequests?: ReactNode;
}) {
  const [t, locale, timezone, [roster, firstName, dues]] = await Promise.all([
    getT(homeMessages), getLocale(), getTimezone(), data,
  ]);
  const today = localDate(now, timezone);
  const players = (roster.players ?? []).map(player => ({ ...player, playerToday: localDate(now, player.timezone ?? timezone) }));
  const header = <>
    <PageBarTitle title={t(greetingPeriod(now, timezone), { name: firstName })}
      subtitle={t('date', { weekday: formatDateAr(today, { weekday: 'long' }, locale), date: formatDateAr(today, { day: 'numeric', month: 'long' }, locale) })} />
    <PageBarActions><HomeInvite name={firstName} label={t('invite')} /></PageBarActions>
  </>;
  if (roster.error) return <section data-tour-ready="true">{header}<WorkspaceError /></section>;
  const [summary, followup, renewals, pending] = await Promise.all([
    readHome(loadHomeSummary(now)), readHome(loadHomeFollowup(now)), readHome(listRenewalRequests()), readHome(loadTasks(now.toISOString())),
  ]);
  if (!summary || !followup || !pending) return <section data-tour-ready="true">{header}<WorkspaceError /></section>;
  const tasks = buildHomeTasks(pending.tasks);
  const count = tasks.length;
  const contacts = await readHome(loadHomeContacts(tasks.filter(task => task.kind === 'absent').map(task => task.playerId)));
  const training = trainingToday(players, summary.sessions, now, timezone);
  const weekStart = saturdayWeek(today)[0] ?? today;
  const hasPrevious = summary.previousAdherence !== 0 || summary.sessions.some(session => session.date < weekStart);
  const finder = (rows: RosterPlayer[]) => rows.map(player => ({ playerId: player.playerId, fullName: player.fullName,
    programTitle: player.programTitle, lastSeen: lastSeenLabel(player.lastTrainingDate, player.playerToday ?? today, locale) }));
  return <section data-tour-ready="true">
    {header}
    <div className="space-y-card-gap">
      <HomeHero tasks={tasks} count={count} completed={summary.completedTasks} adherence={summary.adherence} />
      <HomeTiles adherence={summary.adherence} previous={summary.previousAdherence} hasPrevious={hasPrevious} trained={training.trained} active={training.active}
        pending={count} paid={summary.paid} progress={taskProgress(summary.completedTasks, count)} />
      {!contacts && <WorkspaceError />}
      <div className="grid items-start gap-card-gap min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,330px)]">
        <div className="min-w-0 space-y-card-gap">
          <HomeTaskList tasks={tasks} count={count} contacts={contacts ?? new Map()} today={today} />
          <SmartAlerts alerts={buildAlerts(players, dues, today)} hideEmptyOnPhone={captainWorkspaceEnabled()} />
        </div>
        <div className="min-w-0 space-y-card-gap">
          <PlayerFinder players={finder(players)} recent={finder(recentActivity(players))} />
          <MoneyOwedEntry mode="home" />
          <WorkspaceActivity events={summary.activity} now={now} />
          {players.length === 0 && <HomeStart />}
          <HomeWeekChart sessions={summary.sessions.filter(session => players.some(player => player.playerId === session.playerId))} today={today} />
          <HomeConfirmations requests={followup.requests} payments={renewals?.data ?? []} paymentsFailed={!renewals || Boolean(renewals.error)} /></div>
      </div>
    </div>
  </section>;
}
