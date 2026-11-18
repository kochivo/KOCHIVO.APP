import { daysBetween, localDate } from '@/lib/dates';
import { endingSoon } from '@/lib/ending-soon';
import { currentPayment } from '../current-payment';
import { monthOf } from '../finance';
import type { BillingPlayer, Package } from '../types';

type Subscription = { accessUntil: string; pending?: boolean; frozenAt?: string | null; awaitingPlansAt?: string | null; sessionsLeft?: number | null };
export function activeSubscription(player: Subscription, today: string) {
  return !player.pending && !player.frozenAt && !player.awaitingPlansAt
    && daysBetween(today, player.accessUntil) >= 0 && (player.sessionsLeft == null || player.sessionsLeft > 0);
}

export function expiringSoon<T extends Subscription>(players: T[], today: string) {
  return players.filter(player => !player.pending && !player.frozenAt && !player.awaitingPlansAt
    && endingSoon(today, player.accessUntil))
    .sort((a, b) => a.accessUntil.localeCompare(b.accessUntil));
}

export const paymentFilters = ['all', 'overdue', 'noPackage', 'ending', 'paid'] as const;
export type PaymentFilter = typeof paymentFilters[number];
export type PaymentAction = 'activate' | 'renew' | 'collect' | 'history';

export function paymentRows(players: BillingPlayer[], packages: Package[], today: string) {
  const packagesById = new Map(packages.map(item => [item.id, item]));
  const endingIds = new Set(expiringSoon(players, today).map(player => player.playerId));
  return [...players].sort((a, b) => (b.lastPayment?.created_at ?? '').localeCompare(a.lastPayment?.created_at ?? ''))
    .map(player => {
      const payment = player.lastPayment;
      const chosen = payment?.package_id ? packagesById.get(payment.package_id) : undefined;
      const total = payment?.price_egp ?? chosen?.price_egp ?? null;
      const { paid, method } = currentPayment(payment);
      const hasPackage = Boolean(payment?.package_id) || total !== null;
      const fullyPaid = total !== null && (total === 0 || paid >= total);
      const action: PaymentAction = player.frozenAt ? 'history' : player.pending ? 'activate'
        : player.due > 0 ? 'collect' : !hasPackage ? 'renew'
          : !fullyPaid && total !== null ? 'renew' : 'history';
      return { player, chosen, total, paid, method, hasPackage, fullyPaid, action,
        ending: endingIds.has(player.playerId) };
    });
}

export type PaymentRow = ReturnType<typeof paymentRows>[number];

export function expectedIncome(rows: PaymentRow[], income: number, today: string, timezone: string) {
  const month = monthOf(today);
  return rows.reduce((total, row) => {
    const payment = row.player.lastPayment;
    if (!payment || row.total === null || row.player.due <= 0
      || monthOf(localDate(new Date(payment.created_at), timezone)) !== month) return total;
    return total + Math.min(row.player.due, Math.max(0, row.total - row.paid));
  }, income);
}

export function paymentMatches(row: PaymentRow, filter: PaymentFilter) {
  switch (filter) {
    case 'all': return true;
    case 'overdue': return row.player.due > 0;
    case 'noPackage': return !row.hasPackage;
    case 'ending': return row.ending;
    case 'paid': return row.fullyPaid && row.player.due === 0;
  }
}
export function subscriptionTiles(players: Subscription[], today: string, income: number, pending: number) {
  return { income, pending,
    ending: expiringSoon(players, today).length,
    active: players.filter(player => activeSubscription(player, today)).length };
}
