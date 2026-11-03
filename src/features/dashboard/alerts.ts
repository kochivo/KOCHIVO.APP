import { daysBetween } from '@/lib/dates';
import { playerStatus } from '@/features/roster';
import type { PlayerStatus, RosterPlayer } from '@/features/roster';

export type AlertKind = 'expired' | 'grace' | 'dues' | 'review' | 'ending' | 'noProgram';
export interface SmartAlert {
  kind: AlertKind;
  playerId: string;
  name: string;
  href: string;
  /** EGP owed, open tasks, or days — whichever the kind is about. */
  value: number;
}
export interface DashboardStats { active: number; late: number; ending: number; tasks: number }

// Lost access first, then money, then waiting work, then things that can wait a few days.
const rank: Record<AlertKind, number> = { expired: 0, grace: 1, dues: 2, review: 3, ending: 4, noProgram: 5 };

export function buildAlerts(players: RosterPlayer[], dues: Map<string, number>, today: string): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  for (const player of players) {
    const base = { playerId: player.playerId, name: player.fullName };
    const status = playerStatus({ ...player, today });
    if (status === 'expired' || status === 'grace') {
      alerts.push({ ...base, kind: status, href: '/captain/billing', value: daysBetween(player.accessUntil, today) });
    } else if (status === 'ending') {
      alerts.push({ ...base, kind: 'ending', href: '/captain/billing', value: Math.max(0, daysBetween(today, player.accessUntil)) });
    }
    const due = dues.get(player.playerId) ?? 0;
    if (due > 0) alerts.push({ ...base, kind: 'dues', href: '/captain/billing', value: due });
    if (player.openTasks > 0) alerts.push({ ...base, kind: 'review', href: '/captain/inbox', value: player.openTasks });
    if (!player.programTitle) {
      alerts.push({ ...base, kind: 'noProgram', href: `/captain/players/${player.playerId}/programs`, value: 0 });
    }
  }
  return alerts.sort((a, b) => rank[a.kind] - rank[b.kind] || b.value - a.value || a.name.localeCompare(b.name));
}

export function dashboardStats(players: RosterPlayer[], today: string): DashboardStats {
  const statuses: PlayerStatus[] = players.map((player) => playerStatus({ ...player, today }));
  return {
    active: statuses.filter((status) => status === 'active').length,
    late: statuses.filter((status) => status === 'late').length,
    ending: statuses.filter((status) => status === 'ending').length,
    tasks: players.reduce((sum, player) => sum + player.openTasks, 0),
  };
}

/** Most recent trainers first; players who never trained go last, newest joiners first. */
export function recentActivity(players: RosterPlayer[], limit = 5): RosterPlayer[] {
  return [...players].sort((a, b) => (b.lastTrainingDate ?? '').localeCompare(a.lastTrainingDate ?? '')
    || b.startedOn.localeCompare(a.startedOn)).slice(0, limit);
}

