import type { Locale } from '@/core/i18n/locale';
import { daysBetween, formatDateAr, localDate } from '@/lib/dates';

export function conversationDays<T extends { createdAt: string }>(items: readonly T[], timezone: string) {
  const groups: { date: string; items: T[] }[] = [];
  for (const item of items) {
    const date = localDate(new Date(item.createdAt), timezone);
    const last = groups.at(-1);
    if (last?.date === date) last.items.push(item);
    else groups.push({ date, items: [item] });
  }
  return groups;
}

export function conversationDayLabel(date: string, now: Date, timezone: string, locale: Locale,
  t: (key: 'today' | 'yesterday') => string) {
  const age = daysBetween(date, localDate(now, timezone));
  if (age === 0) return t('today');
  if (age === 1) return t('yesterday');
  return formatDateAr(date, { day: 'numeric', month: 'long', year: 'numeric' }, locale);
}
