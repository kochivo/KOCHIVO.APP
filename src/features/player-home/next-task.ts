import type { MealLogRow, ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { localDate, saturdayWeek } from '@/lib/dates';
import { pickTodayDay } from './next-day';

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
  kind: 'intake' | 'start' | 'continue' | 'meal' | 'checkin' | 'voice' | 'done';
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
  const scheduled = snapshot && (!snapshot.training_days.length || snapshot.training_days.includes(new Date(`${today}T12:00:00Z`).getUTCDay()));
  if (day && (scheduled || session) && !session?.completed_at) {
    return { kind: session ? 'continue' : 'start', href: `/player/workout/${day.id}`, name: day.title };
  }
  const meal = [...input.meals].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    .find(meal => !input.mealLogs.some(log => log.meal_id === meal.id && log.log_date === today && log.completed_at && !log.deleted_at));
  if (meal) return { kind: 'meal', href: '/player/nutrition', name: meal.name };
  if (!input.checkInWeeks.includes(saturdayWeek(today)[0] ?? today)) return { kind: 'checkin', href: '/player/progress' };
  const note = [...input.voiceNotes].filter(note => !note.listenedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
  if (note) return { kind: 'voice', id: note.id, href: '/player/captain' };
  const at = new Date(`${today}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 1);
  const tomorrow = snapshot && (!snapshot.training_days.length || snapshot.training_days.includes(at.getUTCDay()))
    ? pickTodayDay(snapshot, sessions, localDate(at, 'UTC'))?.title : undefined;
  return { kind: 'done', tomorrow };
}
