import { localDate } from '@/lib/dates';
import type { RosterPlayer } from '@/features/roster';

export function activePlayerCount(players: Pick<RosterPlayer, 'accessUntil' | 'pending' | 'frozenAt'>[], today: string) {
  return players.filter(player => !player.pending && !player.frozenAt && player.accessUntil >= today).length;
}

export function monthlyPayments(rows: { created_at: string; amount_egp: number | null }[], now: Date, timezone: string) {
  const month = localDate(now, timezone).slice(0, 7);
  return rows.filter(row => localDate(new Date(row.created_at), timezone).slice(0, 7) === month)
    .reduce((sum, row) => sum + (row.amount_egp ?? 0), 0);
}

export function weeklyAdherence(rows: { planned: number; done: number }[]) {
  const planned = rows.reduce((sum, row) => sum + row.planned, 0);
  return planned ? Math.round(rows.reduce((sum, row) => sum + Math.min(row.planned, row.done), 0) / planned * 100) : 0;
}
