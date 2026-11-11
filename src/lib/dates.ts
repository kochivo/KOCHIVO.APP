import { intlLocale } from '@/core/i18n/locale';
import type { Locale } from '@/core/i18n/locale';
import { isValidTimezone } from './timezone';

export const DEFAULT_TIMEZONE = 'Africa/Cairo';

/**
 * The calendar day a workout or meal belongs to, in the player's timezone (YYYY-MM-DD).
 * Lesson from the legacy audit (K-09/K-10): never derive "today" from UTC.
 */
export function localDate(at: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Weekly programs use Saturday = 0; intake keeps its original Sunday = 0 convention. */
export function weeklyWeekday(date: string): number {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 1) % 7;
}

export function saturdayWeek(today: string): string[] {
  const anchor = new Date(`${today}T12:00:00Z`);
  const offset = (anchor.getUTCDay() + 1) % 7;
  return Array.from({ length: 7 }, (_, index) => {
    const at = new Date(anchor);
    at.setUTCDate(at.getUTCDate() - offset + index);
    return localDate(at, 'UTC');
  });
}

// Arabic dates use Latin digits so they match weights, reps and amounts on the same line.
const numberingSystem = 'latn';

export function formatDateAr(date: string, options: Intl.DateTimeFormatOptions, locale: Locale = 'ar'): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { ...options, numberingSystem, timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`));
}

export function formatTimestampAr(iso: string, options: Intl.DateTimeFormatOptions, locale: Locale = 'ar', timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { ...options, numberingSystem, timeZone: isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE }).format(new Date(iso));
}
