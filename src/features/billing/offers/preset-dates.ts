import { localDate } from '@/lib/dates';
import { timezoneMidnight } from '@/lib/timezone';

export const presets = ['blackFriday', 'ramadan', 'summer', 'newYear', 'scratch'] as const;
export type Preset = typeof presets[number];

export function zonedInput(iso: string, zone: string): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return `${localDate(date, zone)}T${time}`;
}

export function inputInstant(input: string, zone: string): string {
  const [date = '', time = ''] = input.split('T');
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  const wall = Date.parse(`${date}T${time}:00Z`);
  let candidate = timezoneMidnight(date, zone) + (hour * 60 + minute) * 60_000;
  for (let index = 0; index < 3; index++) {
    const displayed = Date.parse(`${zonedInput(new Date(candidate).toISOString(), zone)}:00Z`);
    if (displayed === wall) break;
    candidate += wall - displayed;
  }
  return new Date(candidate).toISOString();
}

export function presetDates(preset: Preset, now: Date, zone: string) {
  const year = Number(localDate(now, zone).slice(0, 4));
  let start: string, end: string;
  if (preset === 'blackFriday') {
    const last = new Date(Date.UTC(year, 10, 30, 12));
    const day = 30 - (last.getUTCDay() + 2) % 7;
    start = `${year}-11-${day}`;
    end = localDate(new Date(Date.UTC(year, 10, day + 3, 12)), 'UTC');
  } else if (preset === 'ramadan') {
    // The Islamic calendar supplies a suggestion; the captain can adjust for local moon sighting.
    const calendar = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', month: 'numeric', day: 'numeric' });
    let candidate = new Date(Date.UTC(year, 0, 1, 12));
    for (let day = 0; day < 366; day++) {
      candidate = new Date(Date.UTC(year, 0, day + 1, 12));
      const parts = calendar.formatToParts(candidate);
      if (parts.find(part => part.type === 'month')?.value === '9' && parts.find(part => part.type === 'day')?.value === '1') break;
    }
    start = localDate(candidate, 'UTC');
    end = localDate(new Date(candidate.getTime() + 29 * 86_400_000), 'UTC');
  } else if (preset === 'summer') { start = `${year}-06-01`; end = `${year}-08-31`; }
  else if (preset === 'newYear') { start = `${year}-01-01`; end = `${year}-01-07`; }
  else { start = localDate(now, zone); end = localDate(new Date(now.getTime() + 7 * 86_400_000), zone); }
  return { starts: `${start}T00:00`, ends: `${end}T23:59` };
}
