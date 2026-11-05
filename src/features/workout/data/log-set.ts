import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
const t = createT(messages, 'ar');

import { saveAndQueue, type KochivoDB, type SetLogRow, type SnapshotDay } from '@/core/offline';
import { sessionId, setId } from '../ids';

export async function startSession(db: KochivoDB, day: Readonly<Pick<SnapshotDay, 'id'>>, today: string, now: number) {
  const id = await sessionId(day.id, today);
  const timestamp = new Date(now).toISOString();
  return db.transaction('rw', db.workout_sessions, db.outbox, async () => {
    const existing = await db.workout_sessions.get(id);
    if (existing) return existing;
    const row = { id, program_day_id: day.id, training_date: today, started_at: timestamp,
      completed_at: null, client_updated_at: timestamp };
    await saveAndQueue(db, 'workout_sessions', row, now);
    return row;
  });
}

export type LogSetInput = Pick<SetLogRow,
  'session_id' | 'program_exercise_id' | 'exercise_id' | 'set_index' | 'weight_kg' | 'reps'>;

export async function logSet(db: KochivoDB, input: LogSetInput, now: number): Promise<void> {
  const id = await setId(input.session_id, input.program_exercise_id, input.set_index);
  const timestamp = new Date(now).toISOString();
  await saveAndQueue(db, 'set_logs', { ...input, id, completed_at: timestamp,
    client_updated_at: timestamp, deleted_at: null }, now);
}

export async function finishSession(db: KochivoDB, id: string, now: number): Promise<void> {
  await db.transaction('rw', db.workout_sessions, db.outbox, async () => {
    const row = await db.workout_sessions.get(id);
    if (!row) throw new Error(t('sessionNotFoundOnThisPhone'));
    const timestamp = new Date(now).toISOString();
    await saveAndQueue(db, 'workout_sessions', { ...row, completed_at: timestamp, client_updated_at: timestamp }, now);
  });
}
