import { localDate } from '@/lib/dates';
import type { Revenue } from './types';

type Money = { amount_egp: number | null; created_at: string };

/** "2026-11" for a YYYY-MM-DD date. */
export const monthOf = (date: string) => date.slice(0, 7);

export function previousMonth(month: string): string {
  const [year = 0, value = 1] = month.split('-').map(Number);
  return value === 1 ? `${year - 1}-12` : `${year}-${String(value - 1).padStart(2, '0')}`;
}

/** UTC lower bound for the revenue query: a day before last month starts covers any Cairo offset. */
export function revenueSince(today: string): string {
  return new Date(Date.parse(`${previousMonth(monthOf(today))}-01T00:00:00Z`) - 86_400_000).toISOString();
}

/** Money received counts in the Cairo month it was recorded, whether a renewal or a later installment. */
export function summarizeRevenue(received: Money[], dues: { due_egp: number }[], today: string): Revenue {
  const current = monthOf(today);
  const last = previousMonth(current);
  let thisMonth = 0;
  let lastMonth = 0;
  for (const row of received) {
    const month = monthOf(localDate(new Date(row.created_at)));
    if (month === current) thisMonth += row.amount_egp ?? 0;
    else if (month === last) lastMonth += row.amount_egp ?? 0;
  }
  return { thisMonth, lastMonth, dues: dues.reduce((sum, row) => sum + row.due_egp, 0), owing: dues.length };
}

/** Change against last month as a whole percent, or null when last month had nothing to compare. */
export function monthChange(revenue: Pick<Revenue, 'thisMonth' | 'lastMonth'>): number | null {
  return revenue.lastMonth > 0 ? Math.round(((revenue.thisMonth - revenue.lastMonth) / revenue.lastMonth) * 100) : null;
}

/** What is left on a renewal after paying `paid` now; never below zero. */
export function remaining(price: number | null, paid: number | null): number {
  return price === null ? 0 : Math.max(0, price - (paid ?? 0));
}
