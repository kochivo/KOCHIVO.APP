import { DEFAULT_TIMEZONE, localDate, saturdayWeek } from '@/lib/dates';
import { timezoneMidnight } from '@/lib/timezone';
export function cairoMidnight(date: string, timezone = DEFAULT_TIMEZONE): number {
  return timezoneMidnight(date, timezone);
}
export function weekStart(now: Date, timezone = DEFAULT_TIMEZONE): number {
  return cairoMidnight(saturdayWeek(localDate(now, timezone))[0] ?? localDate(now, timezone), timezone);
}
