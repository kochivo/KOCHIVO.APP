import type { RosterPlayer } from '@/features/roster';
import { daysBetween } from '@/lib/dates';
import { buildAlerts } from './alerts';

export interface CaptainTask {
  kind: 'invite' | 'noProgram' | 'review' | 'renew' | 'dues' | 'late' | 'done';
  href: string;
  name?: string;
  count?: number;
}

export function captainNextTasks(players: RosterPlayer[], dues: Map<string, number>, today: string): CaptainTask[] {
  if (!players.length) return [{ kind: 'invite', href: '/captain/players' }];
  const ordered = [...players].sort((a, b) => a.startedOn.localeCompare(b.startedOn) || a.playerId.localeCompare(b.playerId));
  const alerts = buildAlerts(ordered, dues, today);
  const tasks: CaptainTask[] = [];
  for (const player of ordered.filter(player => !player.programTitle)) {
    const alert = alerts.find(alert => alert.kind === 'noProgram' && alert.playerId === player.playerId);
    if (alert) tasks.push({ kind: 'noProgram', name: alert.name, href: alert.href });
  }
  const count = alerts.filter(alert => alert.kind === 'review').reduce((sum, alert) => sum + alert.value, 0);
  if (count) tasks.push({ kind: 'review', count, href: '/captain/inbox' });
  for (const alert of alerts.filter(alert => alert.kind === 'expired' || alert.kind === 'grace')) {
    tasks.push({ kind: 'renew', name: alert.name, href: alert.href });
  }
  for (const alert of alerts.filter(alert => alert.kind === 'dues')) {
    tasks.push({ kind: 'dues', name: alert.name, href: alert.href });
  }
  const late = ordered.filter(player => daysBetween(player.lastTrainingDate ?? player.startedOn, today) >= 7)
    .sort((a, b) => (a.lastTrainingDate ?? a.startedOn).localeCompare(b.lastTrainingDate ?? b.startedOn)
      || a.playerId.localeCompare(b.playerId));
  for (const player of late) tasks.push({ kind: 'late', name: player.fullName, href: `/captain/players/${player.playerId}` });
  return tasks.length ? tasks : [{ kind: 'done', href: '/captain/players' }];
}
