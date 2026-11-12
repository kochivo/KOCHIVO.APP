import 'server-only';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { getLocale, getT } from '@/core/i18n/server';
import { getTimezone } from '@/core/timezone/server';
import type { RosterResult } from '@/features/roster';
import { formatDateAr, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { loadHomeSummary } from '../data/workspace';
import { loadHomeFollowup } from '../data/home-followup';
import { loadHomeContacts } from '../data/home-contacts';
import { activePlayerCount } from '../workspace-maths';
import { endingPlayers, greetingPeriod, homeNeeds, summaryLine } from '../home/model';
import { homeMessages } from '../home/messages';
import { HomeInvite } from '../home/home-invite';
import { HomePanelEntry } from '../home/home-panel-entry';
import { HomeRosterPanel } from '../home/home-roster-panel';
import { HomeTasks } from '../home/home-tasks';
import { HomeNeeds } from '../home/home-needs';
import { HomeSideCards } from '../home/home-side-cards';
import { HomeStart } from '../home/home-start';
import { WorkspaceActivity } from './workspace-activity';
import { WorkspaceError } from './workspace-error';

async function readHome<T>(read: Promise<T>) {
  try { return await read; } catch (error) { unstable_rethrow(error); return null; }
}

export async function WorkspaceHome({ data, plan, coachLink, joinRequests, now = new Date() }: {
  data: Promise<[RosterResult, string, Map<string, number>]>; today: string; now?: Date;
  plan?: ReactNode; coachLink?: ReactNode; joinRequests?: ReactNode;
}) {
  const [t, locale, timezone, [roster, firstName, dues]] = await Promise.all([
    getT(homeMessages), getLocale(), getTimezone(), data,
  ]);
  const today = localDate(now, timezone);
  const players = (roster.players ?? []).map(player => ({ ...player, playerToday: localDate(now, player.timezone ?? timezone) }));
  const [summary, followup] = roster.error ? [null, null] : await Promise.all([
    readHome(loadHomeSummary(now)), readHome(loadHomeFollowup(now)),
  ]);
  const ending = endingPlayers(players, now, timezone);
  const line = followup ? summaryLine({ replies: followup.count,
    unpaid: [...dues.values()].filter(value => value > 0).length, ending: ending.length }, t) : '';
  const header = <header className="mb-[18px] flex flex-wrap items-center justify-between gap-3.5">
    <div className="min-w-0"><p className="mb-1 text-xs text-faint">{t('date', { weekday: formatDateAr(today, { weekday: 'long' }, locale), date: formatDateAr(today, { day: 'numeric', month: 'long' }, locale) })}</p>
      <h1 className="font-display text-[30px] font-semibold leading-tight">{t(greetingPeriod(now, timezone), { name: firstName })}</h1>
      {line && <p className="mt-1 text-[13px] text-muted">{line.split(/(\d+)/u).map((part, index) => index % 2
        ? <b key={index} className="font-display font-extrabold tabular-nums text-ink">{part}</b> : part)}</p>}</div>
    {(players.length > 0 || roster.error) && <HomeInvite name={firstName} label={t('invite')} />}
  </header>;
  if (roster.error) return <section data-tour-ready="true">{header}<WorkspaceError /></section>;
  const rows = homeNeeds(followup?.rows ?? [], players, now, timezone);
  const contacts = await readHome(loadHomeContacts(rows.filter(row => row.kind === 'absent').map(row => row.playerId)));
  const failed = !summary || !followup || !contacts;
  const overdue = [...dues.values()].reduce((sum, value) => sum + Math.max(0, value), 0);
  const delta = summary ? summary.adherence - summary.previousAdherence : null;
  const taskPlayers = players.map(player => ({ ...player, openTasks: player.openTasks + (summary?.assessments.get(player.playerId) ?? 0) }));
  const tiles = [
    { key: 'active', value: activePlayerCount(players, today), hint: summary?.limit == null ? null : t('limit', { limit: summary.limit }),
      title: 'playersDetails', content: <><section aria-label={t('playersDetails')}><HomeRosterPanel players={players} dues={[...dues]} today={today} /></section>{coachLink}</> },
    { key: 'adherence', value: summary?.adherence, hint: delta === null ? null : t('comparison', { value: `${delta > 0 ? '+' : ''}${formatNumber(delta, locale)}` }),
      title: 'activityDetails', content: summary ? <><WorkspaceActivity events={summary.activity} now={now} />
        <HomeTasks players={taskPlayers} dues={[...dues]} today={today} mealPlanPlayers={[...summary.mealPlanPlayers]} lastPayments={[...summary.lastPayments]} /></> : <WorkspaceError /> },
    { key: 'paid', value: summary?.paid, hint: summary ? t('lateAmount', { amount: formatNumber(overdue, locale) }) : null,
      title: 'billingDetails', content: <><Link href="/captain/billing" className="inline-flex min-h-12 items-center rounded-full border border-line px-4 text-sm">{t('payments')}</Link>
        <Link href="/captain/settings" className="ms-2 inline-flex min-h-12 items-center rounded-full border border-line px-4 text-sm">{t('myPlan')}</Link>{plan}</> },
  ] as const;
  return <section data-tour-ready="true">
    {header}
    {failed && <div className="mb-4"><WorkspaceError /></div>}
    <div data-home-tiles className="mb-4 grid grid-cols-1 gap-3 min-[761px]:grid-cols-3">{tiles.map(tile =>
      <HomePanelEntry key={tile.key} id={`home-${tile.key}`} title={t(tile.title)} content={tile.content}
        className="glass-strong min-h-12 min-w-0 rounded-card border border-line-soft px-4 py-3.5 text-start font-sans focus-visible:outline-2 focus-visible:outline-lime">
        <span className="block text-xs text-faint">{t(tile.key)}</span>
        <span className="mt-1 block font-display text-[26px] font-extrabold tabular-nums">{tile.value == null ? t('unavailable') : tile.key === 'adherence' ? t('percent', { value: formatNumber(tile.value, locale) }) : formatNumber(tile.value, locale)}
          {tile.key === 'paid' && <small className="ms-2 font-sans text-xs font-medium text-faint">{t('currency')}</small>}</span>
        {tile.hint && <span className={`block text-[11.5px] ${tile.key === 'paid' ? 'text-warn' : tile.key === 'adherence' ? delta !== null && delta < 0 ? 'text-warn' : 'text-lime' : 'text-faint'}`}>{tile.hint}</span>}
      </HomePanelEntry>)}</div>
    <div className="grid items-start gap-4 min-[1001px]:grid-cols-[minmax(0,1fr)_320px]">
      {players.length ? <HomeNeeds rows={rows} now={now} failed={!followup} contacts={contacts ?? new Map()} /> : <HomeStart name={firstName} />}
      <HomeSideCards ending={ending} requests={followup?.requests ?? []} now={now} timezone={timezone} joinRequests={joinRequests} />
    </div>
  </section>;
}
