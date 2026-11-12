import { daysBetween } from '@/lib/dates';

type Subscription = { accessUntil: string; due: number; pending?: boolean; frozenAt?: string | null; sessionsLeft?: number | null };
export const paymentSegments = ['all', 'overdue', 'ending', 'paid'] as const;
export type PaymentSegment = typeof paymentSegments[number];
export function paymentSegment(player: Subscription, today: string): Exclude<PaymentSegment, 'all'> | null {
  if (player.pending || player.frozenAt) return null;
  const days = daysBetween(today, player.accessUntil);
  if (player.due > 0 || (player.sessionsLeft == null && days < 0)) return 'overdue';
  if (player.sessionsLeft === 0 || (player.sessionsLeft == null && days <= 7)) return 'ending';
  return 'paid';
}
export function segmentCounts(players: Subscription[], today: string) {
  const counts = { all: players.length, overdue: 0, ending: 0, paid: 0 };
  for (const player of players) {
    const segment = paymentSegment(player, today);
    if (segment) counts[segment]++;
  }
  return counts;
}
export function billingState(player: Subscription, today: string) {
  const days = daysBetween(today, player.accessUntil);
  if (player.frozenAt) return { label: 'frozen', action: 'unfreeze', tone: 'text-muted bg-surface-raised', days: 0 } as const;
  if (player.pending) return { label: 'pending', action: 'activate', tone: 'text-muted bg-surface-raised', days: 0 } as const;
  if (days < 0 && player.sessionsLeft == null) return { label: 'overdue', action: 'record', tone: 'text-danger bg-danger-soft', days: -days } as const;
  if (player.due > 0) return { label: 'active', action: 'record', tone: 'text-warn bg-warn-soft', days: 0 } as const;
  if (days <= 7 && player.sessionsLeft == null) return { label: 'ending', action: 'remind', tone: 'text-warn bg-warn-soft', days } as const;
  return { label: 'active', action: 'renew', tone: 'text-lime bg-lime-soft', days } as const;
}
export function endingThisWeek(players: Subscription[], today: string) {
  return players.filter(player => !player.pending && !player.frozenAt && player.sessionsLeft == null
    && daysBetween(today, player.accessUntil) >= 0 && daysBetween(today, player.accessUntil) <= 7).length;
}
