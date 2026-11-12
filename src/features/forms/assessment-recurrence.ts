import type { AssessmentSchedule } from '@/types/assessment-schedules';
import { daysBetween, localDate } from '@/lib/dates';

export type Recurrence = Pick<AssessmentSchedule, 'kind' | 'every_days' | 'weekday' | 'day' | 'hour' | 'minute'
  | 'starts_on' | 'ends_on' | 'max_times' | 'paused_at'>;

function addDays(date: string, days: number) {
  return localDate(new Date(Date.parse(`${date}T12:00Z`) + days * 86_400_000), 'UTC');
}
export function assessmentDueDate(s: Recurrence, date: string, joined?: string): boolean {
  if (date < s.starts_on || s.ends_on && date > s.ends_on) return false;
  const d = new Date(`${date}T12:00Z`);
  if (s.kind === 'once') return date === s.starts_on;
  if (s.kind === 'on_join') return date === joined;
  if (s.kind === 'days') return !!s.every_days && daysBetween(s.starts_on, date) % s.every_days === 0;
  if (s.kind === 'week') return d.getUTCDay() === s.weekday;
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return d.getUTCDate() === Math.min(s.day ?? 1, last);
}
export function assessmentDates(s: Recurrence, joined?: string, limit = 10000): string[] {
  if (s.kind === 'once' || s.kind === 'on_join') {
    const date = s.kind === 'once' ? s.starts_on : joined;
    return date && assessmentDueDate(s, date, joined) ? [date] : [];
  }
  function monthDate(date: string, advance = 0): string {
    const d = new Date(`${date}T12:00Z`), year = d.getUTCFullYear(), month = d.getUTCMonth() + advance;
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return localDate(new Date(Date.UTC(year, month, Math.min(s.day ?? 1, last), 12)), 'UTC');
  }
  let date = s.starts_on;
  if (s.kind === 'month') {
    date = monthDate(date);
    if (date < s.starts_on) date = monthDate(date, 1);
  } else if (s.kind === 'week') {
    date = addDays(date, ((s.weekday ?? 0) - new Date(`${date}T12:00Z`).getUTCDay() + 7) % 7);
  }
  const step = s.kind === 'week' ? 7 : s.every_days;
  if (s.kind === 'days' && (!step || step < 2)) return [];
  const dates: string[] = [];
  while ((!s.ends_on || date <= s.ends_on) && dates.length < Math.min(s.max_times ?? limit, limit)) {
    dates.push(date);
    date = s.kind === 'month' ? monthDate(date, 1) : addDays(date, step ?? 7);
  }
  return dates;
}
export function nextAssessmentDate(s: Recurrence, now: Date, timezone: string, joined?: string, sent = 0): string | null {
  if (s.paused_at || s.max_times !== null && sent >= s.max_times) return null;
  if (sent && (s.kind === 'once' || s.kind === 'on_join')) return null;
  const today = localDate(now, timezone);
  if (s.kind === 'once' || s.kind === 'on_join') {
    const due = s.kind === 'once' ? s.starts_on : joined;
    if (due && due >= s.starts_on && due <= today && (!s.ends_on || today <= s.ends_on)) return today;
  }
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, hourCycle: 'h23', hour: 'numeric', minute: 'numeric' }).formatToParts(now);
  const minutes = Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
  const start = today > s.starts_on ? today : s.starts_on;
  const end = s.ends_on ?? addDays(start, 370);
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (date === today && minutes > s.hour * 60 + s.minute) continue;
    if (assessmentDueDate(s, date, joined)) return date;
  }
  return null;
}
