import { localDate } from '@/lib/dates';
import type { RosterPlayer } from '@/features/roster';
import { summarizeRevenue } from '@/features/billing/server';

export function activePlayerCount(players: Pick<RosterPlayer, 'accessUntil' | 'pending' | 'frozenAt'>[], today: string) {
  return players.filter(player => !player.pending && !player.frozenAt && player.accessUntil >= today).length;
}

export function monthlyPayments(rows: { created_at: string; amount_egp: number | null }[], now: Date, timezone: string) {
  return summarizeRevenue(rows, [], localDate(now, timezone), timezone).thisMonth;
}

export function weeklyAdherence(rows: { planned: number; done: number }[]) {
  const planned = rows.reduce((sum, row) => sum + row.planned, 0);
  return planned ? Math.round(rows.reduce((sum, row) => sum + Math.min(row.planned, row.done), 0) / planned * 100) : 0;
}
