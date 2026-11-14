import { daysBetween } from '@/lib/dates';

type Subscription = { accessUntil: string; pending?: boolean; frozenAt?: string | null; sessionsLeft?: number | null };
export function expiringSoon<T extends Subscription>(players: T[], today: string) {
  return players.filter(player => !player.pending && !player.frozenAt && player.sessionsLeft == null
    && daysBetween(today, player.accessUntil) >= 0 && daysBetween(today, player.accessUntil) <= 30)
    .sort((a, b) => a.accessUntil.localeCompare(b.accessUntil));
}
export function subscriptionTiles(players: Subscription[], today: string, income: number, pending: number) {
  return { income, pending,
    ending: expiringSoon(players, today).filter(player => daysBetween(today, player.accessUntil) <= 7).length,
    active: players.filter(player => !player.pending && !player.frozenAt
      && (player.sessionsLeft == null ? daysBetween(today, player.accessUntil) >= 0 : player.sessionsLeft > 0)).length };
}
