import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';

export function pickTodayDay(snapshot: ProgramSnapshot, sessions: WorkoutSessionRow[], today: string) {
  const days = [...snapshot.days].sort((a, b) => a.position - b.position);
  const relevant = sessions.filter((session) => session.training_date <= today && days.some((day) => day.id === session.program_day_id));
  const logged = relevant.find((session) => session.training_date === today);
  if (logged) return days.find((day) => day.id === logged.program_day_id);
  const latest = relevant.filter((session) => session.completed_at).sort((a, b) =>
    (b.completed_at ?? '').localeCompare(a.completed_at ?? '') || b.id.localeCompare(a.id))[0];
  const index = days.findIndex((day) => day.id === latest?.program_day_id);
  return days[(index + 1) % days.length];
}
