import type { RosterPlayer } from '@/features/roster';
import { localDate, saturdayWeek } from '@/lib/dates';
import { buildAlerts } from '../alerts';
import { homeNeeds } from './model';
import type { ReviewRow } from './model';

export type HomeTask = {
  id: string; playerId: string; name: string; href: string;
  kind: 'checkin' | 'form' | 'assessment' | 'absent' | 'noProgram' | 'renew' | 'dues';
  title?: string; days?: number; urgent: boolean;
};
export const taskEstimate = (count: number) => count * 3;
export const taskProgress = (completed: number, pending: number) => completed + pending ? completed / (completed + pending) : 1;

export function buildHomeTasks(reviews: ReviewRow[], players: RosterPlayer[], dues: Map<string, number>, now: Date, timezone: string): HomeTask[] {
  const today = localDate(now, timezone);
  const needs = homeNeeds(reviews, players, now, timezone, Infinity);
  const tasks: HomeTask[] = needs.map(row => ({ id: `${row.kind}:${row.id}`, playerId: row.playerId, name: row.name,
    kind: row.kind, href: row.kind === 'absent' ? `/captain/players/${row.playerId}` : '/captain/inbox',
    urgent: row.kind === 'absent' ? row.days >= 7 : row.flags.length > 0,
    ...('days' in row ? { days: row.days } : { title: row.title }) }));
  const eligible = players.filter(player => !player.pending && !player.frozenAt);
  for (const alert of buildAlerts(eligible, dues, today)) {
    if (alert.kind === 'review') continue;
    const kind = alert.kind === 'noProgram' || alert.kind === 'dues' ? alert.kind : 'renew';
    tasks.push({ id: `${kind}:${alert.playerId}`, playerId: alert.playerId, name: alert.name,
      kind, href: alert.href, days: alert.value, urgent: false });
  }
  return tasks;
}

export function weekChart(sessions: { date: string }[], today: string) {
  return saturdayWeek(today).map(date => ({ date, count: sessions.filter(session => session.date === date).length, passed: date < today }));
}

export function trainingToday(players: RosterPlayer[], sessions: { playerId: string; date: string }[], now: Date, timezone: string) {
  const active = players.filter(player => !player.pending && !player.frozenAt
    && player.accessUntil >= localDate(now, player.timezone ?? timezone));
  const trained = active.filter(player => sessions.some(session => session.playerId === player.playerId
    && session.date === localDate(now, player.timezone ?? timezone))).length;
  return { trained, active: active.length };
}
