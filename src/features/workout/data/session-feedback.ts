import { saveAndQueue, type KochivoDB } from '@/core/offline';

export const rpeValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const validRpe = (value: number) => Number.isInteger(value) && value >= 1 && value <= 10;

export async function saveSessionFeedback(db: KochivoDB, id: string,
  feedback: { rpe: number; note: string } | null, now: number): Promise<void> {
  if (!feedback) return;
  if (!validRpe(feedback.rpe) || feedback.note.length > 500) throw new Error('Invalid session feedback');
  await db.transaction('rw', db.workout_sessions, db.outbox, async () => {
    const row = await db.workout_sessions.get(id);
    if (!row?.completed_at) throw new Error('Completed session required');
    // A completion and its feedback can be saved in the same millisecond.
    const updated = Math.max(now, Date.parse(row.client_updated_at) + 1);
    await saveAndQueue(db, 'workout_sessions', { ...row, session_rpe: feedback.rpe,
      player_note: feedback.note.trim() || null, client_updated_at: new Date(updated).toISOString() }, now);
  });
}
