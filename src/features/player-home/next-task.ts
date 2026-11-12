import type { MealLogRow, ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { daysBetween, localDate, saturdayWeek } from '@/lib/dates';
import { isWeeklyProgram, pickTodayDay } from './next-day';

export interface PlayerTaskInput {
  today: string;
  intakeDone: boolean;
  snapshot: ProgramSnapshot | null;
  sessions: WorkoutSessionRow[];
  meals: { id: string; name: string; position: number }[];
  mealLogs: MealLogRow[];
  checkInWeeks: string[];
  voiceNotes: { id: string; createdAt: string; listenedAt: string | null }[];
}
export interface PlayerTask {
  kind: 'intake' | 'start' | 'continue' | 'meal' | 'checkin' | 'voice' | 'done' | 'waiting';
  href?: string;
  name?: string;
  id?: string;
  tomorrow?: string;
}

export function playerNextTask(input: PlayerTaskInput): PlayerTask {
  const { today, snapshot, sessions } = input;
  if (!input.intakeDone) return { kind: 'intake', href: '/player/onboarding' };
  const day = snapshot ? pickTodayDay(snapshot, sessions, today) : undefined;
  const session = sessions.find(session => session.training_date === today && session.program_day_id === day?.id);
  const weekly = snapshot ? isWeeklyProgram(snapshot) : false;
  const scheduled = snapshot && (weekly ? Boolean(day && !day.is_rest_day) :
    !snapshot.training_days.length || snapshot.training_days.includes(new Date(`${today}T12:00:00Z`).getUTCDay()));
  if (day && !day.is_rest_day && (!weekly || day.exercises.length > 0) && (scheduled || session) && !session?.completed_at) {
    return { kind: session ? 'continue' : 'start', href: `/player/workout/${day.id}`, name: day.title };
  }
  const meal = [...input.meals].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    .find(meal => !input.mealLogs.some(log => log.meal_id === meal.id && log.log_date === today && log.completed_at && !log.deleted_at));
  if (meal) return { kind: 'meal', href: '/player/nutrition', name: meal.name };
  const recent = (date: string) => daysBetween(date, today) >= 0 && daysBetween(date, today) < 7;
  const active = sessions.some(session => session.completed_at && recent(session.training_date)) ||
    input.mealLogs.some(log => log.completed_at && !log.deleted_at && recent(log.log_date));
  if (snapshot && active && !input.checkInWeeks.includes(saturdayWeek(today)[0] ?? today)) return { kind: 'checkin', href: '/player/progress' };
  const note = [...input.voiceNotes].filter(note => !note.listenedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
  if (note) return { kind: 'voice', id: note.id, href: '/player/captain' };
  if (!snapshot && !input.meals.length) return { kind: 'waiting' };
  const at = new Date(`${today}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 1);
  const next = snapshot ? pickTodayDay(snapshot, sessions, localDate(at, 'UTC')) : undefined;
  const tomorrow = snapshot && (weekly ? next && !next.is_rest_day :
    !snapshot.training_days.length || snapshot.training_days.includes(at.getUTCDay())) ? next?.title : undefined;
  return { kind: 'done', tomorrow };
}
