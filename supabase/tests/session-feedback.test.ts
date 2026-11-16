import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let other: string;
const id = '01900000-0000-7000-8000-000000000081';
const base = { id, training_date: '2026-11-05', started_at: '2026-11-05T10:00:00Z',
  completed_at: '2026-11-05T11:00:00Z', client_updated_at: '2026-11-05T11:00:00Z' };
const sync = (user: string, row: object) => asUser(db, user,
  tx => tx.query('select public.sync_workout_sessions($1::jsonb)', [JSON.stringify([row])]));
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ player: other } = await createCaptainWithPlayer(db));
});
afterAll(async () => { await db?.close(); });

it('enforces RPE and note bounds', async () => {
  for (const session_rpe of [0, 11]) await expect(sync(player, { ...base, session_rpe })).rejects.toThrow(/check constraint/);
  await expect(sync(player, { ...base, player_note: 'x'.repeat(501) })).rejects.toThrow(/check constraint/);
  await sync(player, { ...base, session_rpe: 1, player_note: 'x'.repeat(500) });
});
it('allows only the owner to write, and the active coach to read', async () => {
  await expect(sync(other, { ...base, session_rpe: 10, client_updated_at: '2026-11-05T12:00:00Z' })).rejects.toThrow(/row-level security/);
  const read = (user: string) => asUser(db, user, tx => tx.query('select session_rpe, player_note from public.workout_sessions where id = $1', [id]));
  expect((await read(captain)).rows).toEqual([{ session_rpe: 1, player_note: 'x'.repeat(500) }]);
  expect((await read(other)).rows).toEqual([]);
});
it('round trips LWW feedback and notifies once even after reading and resync', async () => {
  const row = { ...base, session_rpe: 10, player_note: null, client_updated_at: '2026-11-05T12:00:00Z' };
  await sync(player, row);
  await sync(player, row);
  await sync(player, { ...base, session_rpe: 2 });
  expect((await db.query('select session_rpe, player_note from public.workout_sessions where id = $1', [id])).rows)
    .toEqual([{ session_rpe: 10, player_note: 'x'.repeat(500) }]);
  await asUser(db, captain, tx => tx.query("update public.notifications set is_read = true where type = 'workout_feedback'"));
  await sync(player, { ...row, player_note: 'pain', client_updated_at: '2026-11-05T13:00:00Z' });
  const notifications = await db.query("select user_id, payload from public.notifications where type = 'workout_feedback'");
  expect(notifications.rows).toEqual([{ user_id: captain, payload: { session_id: id, rpe: 1, has_note: true } }]);
});

it('alerts for high effort without a note, but not low effort or a blank note', async () => {
  for (const [suffix, rpe, note] of [['82', 8, null], ['83', 2, '   '], ['84', 9, null]] as const) {
    const sessionId = `01900000-0000-7000-8000-0000000000${suffix}`;
    const row = { ...base, id: sessionId, session_rpe: rpe, player_note: note };
    await sync(player, row); await sync(player, row);
    const result = await db.query("select payload from public.notifications where type = 'workout_feedback' and payload ->> 'session_id' = $1", [sessionId]);
    expect(result.rows).toEqual(rpe >= 9 ? [{ payload: { session_id: sessionId, rpe, has_note: false } }] : []);
  }
});
