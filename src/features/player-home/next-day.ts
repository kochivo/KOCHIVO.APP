import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { isWeeklyProgram, weeklyFinished } from '@/core/offline';
import { localDate, weeklyWeekday } from '@/lib/dates';
export { isWeeklyProgram, weeklyFinished } from '@/core/offline';

export function nextTrainingDay(snapshot: ProgramSnapshot, today: string) {
  for (let offset = 1; offset <= 7; offset++) {
    const at = new Date(`${today}T12:00:00Z`);
    at.setUTCDate(at.getUTCDate() + offset);
    const date = localDate(at, 'UTC');
    if (weeklyFinished(snapshot, date)) return undefined;
    const day = snapshot.days.find(day => day.weekday === weeklyWeekday(date) && !day.is_rest_day);
    if (day) return day;
  }
}

export function pickTodayDay(snapshot: ProgramSnapshot, sessions: WorkoutSessionRow[], today: string) {
  if (isWeeklyProgram(snapshot)) return weeklyFinished(snapshot, today) ? undefined :
    snapshot.days.find(day => day.weekday === weeklyWeekday(today));
  const days = [...snapshot.days].sort((a, b) => a.position - b.position);
  const relevant = sessions.filter((session) => session.training_date <= today && days.some((day) => day.id === session.program_day_id));
  const logged = relevant.find((session) => session.training_date === today);
  if (logged) return days.find((day) => day.id === logged.program_day_id);
  const latest = relevant.filter((session) => session.completed_at).sort((a, b) =>
    (b.completed_at ?? '').localeCompare(a.completed_at ?? '') || b.id.localeCompare(a.id))[0];
  const index = days.findIndex((day) => day.id === latest?.program_day_id);
  return days[(index + 1) % days.length];
}
