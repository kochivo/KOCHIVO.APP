import type { ProgramSnapshot } from '@/core/offline';
import { localDate, saturdayWeek } from '@/lib/dates';
import { isWeeklyProgram, pickTodayDay } from './next-day';

export function shiftDate(date: string, offset: number): string {
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + offset);
  return localDate(at, 'UTC');
}

export function trainingDay(date: string, trainingDays: number[], snapshot?: ProgramSnapshot): boolean {
  if (snapshot && isWeeklyProgram(snapshot)) {
    const day = pickTodayDay(snapshot, [], date);
    return Boolean(day && !day.is_rest_day);
  }
  return trainingDays.length === 0 || trainingDays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}

export interface StreakStats {
  current: number;
  best: number;
  weekDone: number;
  weekPlanned: number;
  monthDone: number;
}

export function computeStreak({ today, completedDates, isTrainingDay, accountStart }: {
  today: string; completedDates: readonly string[]; isTrainingDay: (date: string) => boolean; accountStart: string;
}): StreakStats {
  const completed = new Set(completedDates.filter(date => date >= accountStart && date <= today));
  const start = [...completed].sort()[0] ?? today;
  let run = 0;
  let best = 0;
  for (let date = start; date <= today; date = shiftDate(date, 1)) {
    if (completed.has(date)) run++;
    else if (date !== today && isTrainingDay(date)) run = 0;
    best = Math.max(best, run);
  }
  const week = saturdayWeek(today).filter(date => date >= accountStart);
  return { current: run, best: Math.max(best, run),
    weekDone: week.filter(date => completed.has(date)).length,
    weekPlanned: week.filter(isTrainingDay).length,
    monthDone: [...completed].filter(date => date.slice(0, 7) === today.slice(0, 7)).length };
}
