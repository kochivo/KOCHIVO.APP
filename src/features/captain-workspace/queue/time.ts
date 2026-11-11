import { localDate, saturdayWeek } from '@/lib/dates';
// Resolve Cairo's actual UTC offset for the date, including summer time.
export function cairoMidnight(date: string): number {
  const utc = Date.parse(`${date}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo',
    hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(utc));
  return utc - Number(parts.find(part => part.type === 'hour')?.value ?? 0) * 3_600_000;
}
export function weekStart(now: Date): number {
  return cairoMidnight(saturdayWeek(localDate(now))[0] ?? localDate(now));
}
