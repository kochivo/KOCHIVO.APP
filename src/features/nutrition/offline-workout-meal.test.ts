import { expect, it } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { flushOutbox } from '@/core/offline/sync';
import type { SyncTransport } from '@/core/offline/sync';
import { logSet, startSession } from '../workout/data/log-set';
import { setMealEaten } from './data/log-meal';

it('retains a set and meal through offline failure and reload, then delivers both once', async () => {
  let db = new KochivoDB('v6-offline-set-and-meal');
  const now = Date.parse('2026-11-12T10:00:00Z');
  try {
    const session = await startSession(db, { id: 'day' }, '2026-11-12', now);
    await logSet(db, { session_id: session.id, program_exercise_id: 'press', exercise_id: 'exercise',
      set_index: 1, weight_kg: 52.5, reps: 9 }, now);
    await setMealEaten(db, { mealId: 'breakfast', meal: { id: 'breakfast', name: 'Meal', position: 0, items: [] }, logDate: '2026-11-12', eaten: true, swaps: {} }, now);
    expect(await flushOutbox(db, async () => { throw new Error('offline'); }, now)).toEqual({ sent: 0, failed: 3 });
    db.close();
    db = new KochivoDB('v6-offline-set-and-meal');
    expect(await db.set_logs.toArray()).toMatchObject([{ weight_kg: 52.5, reps: 9 }]);
    expect(await db.meal_logs.toArray()).toMatchObject([{ meal_id: 'breakfast', completed_at: '2026-11-12T10:00:00.000Z' }]);
    const received: string[] = [];
    const send: SyncTransport = async (table, rows) => {
      received.push(table);
      if (table === 'set_logs') expect(rows).toMatchObject([{ weight_kg: 52.5, reps: 9 }]);
      if (table === 'meal_logs') expect(rows).toMatchObject([{ meal_id: 'breakfast', completed_at: '2026-11-12T10:00:00.000Z' }]);
    };
    expect(await flushOutbox(db, send, now + 2000)).toEqual({ sent: 3, failed: 0 });
    expect(received).toEqual(['workout_sessions', 'set_logs', 'meal_logs']);
    expect(await db.outbox.count()).toBe(0);
    expect(await flushOutbox(db, send, now + 4000)).toEqual({ sent: 0, failed: 0 });
    expect(received).toHaveLength(3);
  } finally { await db.delete(); }
});
