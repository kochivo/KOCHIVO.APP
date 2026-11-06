import type { ProgramSnapshot, SnapshotDay, WorkoutSessionRow } from '@/core/offline';
import { daysBetween, weeklyWeekday } from '@/lib/dates';
import { isWeeklyProgram, pickTodayDay, weeklyFinished } from './next-day';

export interface DayPreview {
  day: SnapshotDay | undefined;
  status: 'upcoming' | 'completed' | 'missed' | 'rest';
}

export function previewFor(snapshot: ProgramSnapshot, sessions: WorkoutSessionRow[], date: string, today: string): DayPreview {
  const relevant = sessions.filter(session => snapshot.days.some(day => day.id === session.program_day_id));
  const logged = relevant.filter(session => session.training_date === date);
  const completed = logged.find(session => session.completed_at !== null);
  let day: SnapshotDay | undefined;
  if (isWeeklyProgram(snapshot)) {
    day = weeklyFinished(snapshot, date) ? undefined : snapshot.days.find(day => day.weekday === weeklyWeekday(date));
  } else {
    const session = completed ?? logged[0];
    if (session) day = snapshot.days.find(day => day.id === session.program_day_id);
    else {
      const trains = snapshot.training_days.length === 0 || snapshot.training_days.includes((weeklyWeekday(date) + 6) % 7);
      if (!trains) return { day: undefined, status: 'rest' };
      if (date < today) return { day: undefined, status: 'missed' };
      const days = [...snapshot.days].sort((a, b) => a.position - b.position);
      const current = pickTodayDay(snapshot, relevant, today);
      let steps = 0;
      const distance = daysBetween(today, date);
      for (let offset = 0; offset < distance; offset++) {
        const weekday = (weeklyWeekday(today) + 6 + offset) % 7;
        const extraCompletedToday = offset === 0 && relevant.some(session => session.training_date === today && session.completed_at !== null);
        if (snapshot.training_days.length === 0 || snapshot.training_days.includes(weekday) || extraCompletedToday) steps++;
      }
      const index = days.findIndex(day => day.id === current?.id);
      day = index < 0 ? undefined : days[(index + steps) % days.length];
    }
  }
  if (completed) return { day: day ?? snapshot.days.find(day => day.id === completed.program_day_id), status: 'completed' };
  if (!day || day.is_rest_day) return { day, status: 'rest' };
  return { day, status: date < today ? 'missed' : 'upcoming' };
}
