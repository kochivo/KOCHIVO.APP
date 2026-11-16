import { daysBetween, localDate } from '@/lib/dates';

export interface MoneyOwedRecord {
  player_id: string; amount_egp: number | null;
  reason: 'expired' | 'renewal_pending' | 'receipt_pending' | 'partial'; since: string;
}
export interface MoneyOwedRow {
  playerId: string; name: string; amount: number | null;
  reason: MoneyOwedRecord['reason'] | 'soon'; since: string; days: number;
}
type Player = { playerId: string; fullName: string; accessUntil: string; pending?: boolean;
  frozenAt?: string | null; awaitingPlansAt?: string | null };

export function buildMoneyOwed(records: MoneyOwedRecord[], players: Player[], prices: Map<string, number | null>, now: Date, timezone: string) {
  const today = localDate(now, timezone);
  const names = new Map(players.map(player => [player.playerId, player.fullName]));
  const rows: MoneyOwedRow[] = records.map(record => ({
    playerId: record.player_id, name: names.get(record.player_id) ?? '', amount: record.amount_egp,
    reason: record.reason, since: record.since, days: Math.max(0, daysBetween(record.since, today)),
  }));
  const owing = new Set(records.map(record => record.player_id));
  for (const player of players) {
    const days = daysBetween(today, player.accessUntil);
    if (!player.pending && !player.frozenAt && !player.awaitingPlansAt && !owing.has(player.playerId) && days >= 0 && days <= 3) rows.push({
      playerId: player.playerId, name: player.fullName, amount: prices.get(player.playerId) ?? null,
      reason: 'soon', since: player.accessUntil, days,
    });
  }
  return { rows, total: records.reduce((sum, record) => sum + (record.amount_egp ?? 0), 0),
    count: owing.size, unpriced: records.filter(record => record.amount_egp === null).length };
}
export type MoneyOwed = ReturnType<typeof buildMoneyOwed>;
