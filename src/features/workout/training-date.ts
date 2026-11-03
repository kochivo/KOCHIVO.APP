import type { WorkoutSessionRow } from '@/core/offline';
import { daysBetween } from '@/lib/dates';

// Only a workout that crossed midnight carries over; an abandoned older session must not
// swallow new training under its stale date.
export function trainingDate(today: string,
  session: Pick<WorkoutSessionRow, 'training_date' | 'completed_at'> | null,
  hasLoggedSet: boolean): string {
  const crossedMidnight = session !== null && daysBetween(session.training_date, today) === 1;
  return session && crossedMidnight && !session.completed_at && hasLoggedSet ? session.training_date : today;
}
