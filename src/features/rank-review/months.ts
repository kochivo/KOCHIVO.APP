import type { Locale } from '@/core/i18n/locale';
import { formatDateAr, localDate } from '@/lib/dates';

export function currentMonth(now: Date): string {
  return `${localDate(now).slice(0, 7)}-01`;
}

function shiftMonth(month: string, offset: number): string {
  const date = new Date(`${month}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return localDate(date, 'UTC');
}

export const previousMonth = (month: string) => shiftMonth(month, -1);
export const nextMonth = (month: string) => shiftMonth(month, 1);
export const canGoNext = (month: string, now: Date) => month < currentMonth(now);
export const monthLabel = (month: string, locale: Locale) =>
  formatDateAr(month, { month: 'long', year: 'numeric' }, locale);
