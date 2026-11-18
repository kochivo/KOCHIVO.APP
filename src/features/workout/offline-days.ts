import type { ProgramSnapshot } from '@/core/offline';

export function offlineDays(snapshot: ProgramSnapshot | undefined, userId: string | null) {
  if (!userId || snapshot?.player_id !== userId) return [];
  return snapshot.days.filter(day => !day.is_rest_day && (day.exercises.length > 0 || Boolean(day.cardio?.length)));
}
