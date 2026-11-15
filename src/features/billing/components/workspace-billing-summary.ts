import { daysBetween } from '@/lib/dates';
import { endingSoon } from '@/lib/ending-soon';

type Subscription = { accessUntil: string; pending?: boolean; frozenAt?: string | null; awaitingPlansAt?: string | null; sessionsLeft?: number | null };
export function expiringSoon<T extends Subscription>(players: T[], today: string) {
  return players.filter(player => !player.pending && !player.frozenAt && !player.awaitingPlansAt
    && endingSoon(today, player.accessUntil))
    .sort((a, b) => a.accessUntil.localeCompare(b.accessUntil));
}
export function subscriptionTiles(players: Subscription[], today: string, income: number, pending: number) {
  return { income, pending,
    ending: expiringSoon(players, today).length,
    active: players.filter(player => !player.pending && !player.frozenAt && !player.awaitingPlansAt
      && (player.sessionsLeft == null ? daysBetween(today, player.accessUntil) >= 0 : player.sessionsLeft > 0)).length };
}
