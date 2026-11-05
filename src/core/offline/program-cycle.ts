import type { ProgramSnapshot } from './db';
import { daysBetween } from '@/lib/dates';

export const isWeeklyProgram = (snapshot: ProgramSnapshot) => snapshot.days.some(day => day.weekday != null);

export function weeklyFinished(snapshot: ProgramSnapshot, today: string): boolean {
  return isWeeklyProgram(snapshot) && snapshot.settings.repeatWeekly === false && Boolean(snapshot.starts_on) &&
    daysBetween(snapshot.starts_on ?? today, today) >= 7;
}
