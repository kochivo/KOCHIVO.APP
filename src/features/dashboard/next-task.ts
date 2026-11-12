import type { RosterPlayer } from '@/features/roster';
import { daysBetween } from '@/lib/dates';
import { buildAlerts } from './alerts';

export interface CaptainTask {
  kind: 'invite' | 'noProgram' | 'review' | 'renew' | 'dues' | 'late' | 'done';
  href: string;
  name?: string;
  count?: number;
  days?: number;
  lastTrainingDate?: string | null;
  playerId?: string;
}
export type WorkspaceCaptainTask = Omit<CaptainTask, 'kind'> & { kind: CaptainTask['kind'] | 'noMealPlan' };

export const taskIsPrimary = (index: number) => index === 0;

export function captainNextTasks(players: RosterPlayer[], dues: Map<string, number>, today: string): CaptainTask[];
export function captainNextTasks(players: RosterPlayer[], dues: Map<string, number>, today: string, workspace: { mealPlanPlayers: Set<string> }): WorkspaceCaptainTask[];
export function captainNextTasks(players: RosterPlayer[], dues: Map<string, number>, today: string,
  workspace?: { mealPlanPlayers: Set<string> }): WorkspaceCaptainTask[] {
  if (!players.length) return [{ kind: 'invite', href: '/captain/players' }];
  const ordered = [...players].sort((a, b) => a.startedOn.localeCompare(b.startedOn) || a.playerId.localeCompare(b.playerId));
  const alerts = buildAlerts(ordered, dues, today);
  const tasks: WorkspaceCaptainTask[] = [];
  for (const player of ordered.filter(player => !player.programTitle)) {
    const alert = alerts.find(alert => alert.kind === 'noProgram' && alert.playerId === player.playerId);
    if (alert) tasks.push({ kind: 'noProgram', name: alert.name, href: alert.href, ...(workspace ? { playerId: player.playerId } : {}) });
  }
  const count = alerts.filter(alert => alert.kind === 'review').reduce((sum, alert) => sum + alert.value, 0);
  if (count) tasks.push({ kind: 'review', count, href: '/captain/inbox' });
  if (workspace) {
    tasks.sort((a, b) => Number(b.kind === 'review') - Number(a.kind === 'review'));
    for (const player of ordered.filter(player => !workspace.mealPlanPlayers.has(player.playerId))) {
      tasks.push({ kind: 'noMealPlan', name: player.fullName, playerId: player.playerId, href: `/captain/players/${player.playerId}/nutrition` });
    }
  }
  for (const alert of alerts.filter(alert => alert.kind === 'expired' || alert.kind === 'grace' || (workspace && alert.kind === 'ending'))) {
    tasks.push({ kind: 'renew', name: alert.name, href: alert.href,
      ...(workspace ? { playerId: alert.playerId } : {}),
      ...(workspace && alert.kind === 'ending' ? { days: alert.value } : {}) });
  }
  for (const alert of alerts.filter(alert => alert.kind === 'dues')) {
    tasks.push({ kind: 'dues', name: alert.name, href: alert.href, ...(workspace ? { playerId: alert.playerId } : {}) });
  }
  const late = ordered.filter(player => daysBetween(player.lastTrainingDate ?? player.startedOn, player.playerToday ?? today) >= 7)
    .sort((a, b) => (a.lastTrainingDate ?? a.startedOn).localeCompare(b.lastTrainingDate ?? b.startedOn)
      || a.playerId.localeCompare(b.playerId));
  for (const player of late) tasks.push({ kind: 'late', name: player.fullName, href: `/captain/players/${player.playerId}`,
    ...(workspace ? { count: daysBetween(player.lastTrainingDate ?? player.startedOn, player.playerToday ?? today), lastTrainingDate: player.lastTrainingDate } : {}) });
  return tasks.length ? tasks : [{ kind: 'done', href: '/captain/players' }];
}
