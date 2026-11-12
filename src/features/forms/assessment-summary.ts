import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatDateAr } from '@/lib/dates';
import type { Recurrence } from './assessment-recurrence';
import { assessmentDates } from './assessment-recurrence';
import { messages } from './assessments/messages';

export function assessmentWeekday(day: number, locale: Locale): string {
  return createT(messages, locale)((['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const)[day] ?? 'sunday');
}

export function recurrenceLabel(s: Recurrence, locale: Locale): string {
  const t = createT(messages, locale);
  if (s.kind === 'days') return t('repeatDays', { n: s.every_days ?? 3 });
  if (s.kind === 'week') return t('repeatWeek', { day: assessmentWeekday(s.weekday ?? 0, locale) });
  if (s.kind === 'month') return t('repeatMonth', { n: s.day ?? 1 });
  return t(s.kind);
}
export function assessmentTime(s: Pick<Recurrence, 'hour' | 'minute'>, locale: Locale): string {
  const t = createT(messages, locale);
  return t('time', { time: `${s.hour % 12 || 12}${s.minute ? `:${String(s.minute).padStart(2, '0')}` : ''}`,
    period: t(s.hour < 12 ? 'morning' : 'evening') });
}
export function assessmentSummary(s: Recurrence, name: string | null, title: string, locale: Locale, joined?: string): string {
  const t = createT(messages, locale);
  if (s.kind === 'on_join' && joined && joined < s.starts_on) return t('joinSkipped', { name: name ?? '' });
  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'long' }, locale);
  const finite = s.ends_on !== null || s.max_times !== null || s.kind === 'once' || s.kind === 'on_join';
  const count = finite ? s.kind === 'once' || s.kind === 'on_join' ? 1
    : s.max_times && !s.ends_on ? s.max_times : assessmentDates(s).length : 0;
  return t(name === null ? 'allSummary' : 'summary', { name: name ?? '', title, repeat: recurrenceLabel(s, locale),
    time: assessmentTime(s, locale), start: date(s.starts_on),
    end: s.ends_on ? t('endDate', { date: date(s.ends_on) }) : finite ? '' : t('endForever'),
    count: finite ? t('count', { n: count }) : '' });
}
