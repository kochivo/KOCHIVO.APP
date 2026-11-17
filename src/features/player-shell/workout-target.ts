import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { isRestDay, pickTodayDay } from '@/features/player-home';

export function workoutTarget(snapshot: ProgramSnapshot | null | undefined,
  sessions: WorkoutSessionRow[] | undefined, today: string, restMood = false) {
  const history = sessions?.filter(session => snapshot?.days.some(day => day.id === session.program_day_id));
  const day = snapshot && history && today ? pickTodayDay(snapshot, history, today) : undefined;
  const rest = restMood || Boolean(snapshot && history && today && isRestDay(snapshot, history, today)) || Boolean(day?.is_rest_day);
  return { href: !rest && day ? `/player/workout/${day.id}` : '/player',
    labelKey: rest ? 'v4RestDay' as const : day ? 'v4StartWorkout' as const : 'v4NoProgram' as const, rest };
}
