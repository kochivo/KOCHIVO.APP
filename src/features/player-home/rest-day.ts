import type { ProgramSnapshot } from '@/core/offline';
import type { TodayDecision } from '@/core/offline/use-today-decision';
import { isWeeklyProgram, pickTodayDay } from './next-day';

export function isRestDay(snapshot: ProgramSnapshot, sessions: Parameters<typeof pickTodayDay>[1], today: string): boolean {
  if (!today) return false;
  if (isWeeklyProgram(snapshot)) return Boolean(pickTodayDay(snapshot, sessions, today)?.is_rest_day);
  return snapshot.training_days.length > 0 &&
    !snapshot.training_days.includes(new Date(`${today}T12:00:00Z`).getUTCDay()) &&
    !sessions.some(session => session.training_date === today && snapshot.days.some(day => day.id === session.program_day_id));
}

export function resolveRestDay(snapshot: ProgramSnapshot | null | undefined, sessions: Parameters<typeof pickTodayDay>[1],
  date: string, decision?: TodayDecision | null): boolean {
  if (decision === 'rest') return true;
  if (!snapshot || !date) return false;
  const day = pickTodayDay(snapshot, sessions, date);
  return Boolean(day?.is_rest_day) || (isWeeklyProgram(snapshot) ? !day : isRestDay(snapshot, sessions, date));
}
