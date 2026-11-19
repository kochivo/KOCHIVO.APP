import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let player: string;
const id = '01900000-0000-7000-8000-000000000341';
const row = { id, training_date: '2026-11-16', started_at: '2026-11-16T10:00:00Z',
  completed_at: '2026-11-16T11:00:00Z', client_updated_at: '2026-11-16T11:00:00Z', session_rpe: 8, player_note: 'Done' };
const sync = (value: object) => asUser(db, player, tx => tx.query('select public.sync_workout_sessions($1::jsonb)', [JSON.stringify([value])]));
beforeAll(async () => { db = await createTestDb(); ({ player } = await createCaptainWithPlayer(db)); });
afterAll(async () => { await db?.close(); });
it('preserves completion and feedback on newer null starts, accepts newer feedback and rejects stale writes', async () => {
  await sync(row);
  await sync({ ...row, completed_at: null, session_rpe: null, player_note: null, client_updated_at: '2026-11-16T12:00:00Z' });
  const read = () => db.query('select completed_at is not null as done, session_rpe, player_note from public.workout_sessions where id = $1', [id]);
  expect((await read()).rows).toEqual([{ done: true, session_rpe: 8, player_note: 'Done' }]);
  await sync({ ...row, session_rpe: 9, player_note: 'New', client_updated_at: '2026-11-16T13:00:00Z' });
  await sync(row);
  expect((await read()).rows).toEqual([{ done: true, session_rpe: 9, player_note: 'New' }]);
});

it.each([true, false])('merges an older completion when it syncs first: %s', async completedFirst => {
  const sessionId = completedFirst ? '01900000-0000-7000-8000-000000000342' : '01900000-0000-7000-8000-000000000343';
  const completed = { ...row, id: sessionId };
  const newer = { ...completed, completed_at: null, session_rpe: 9, player_note: null,
    client_updated_at: '2026-11-16T12:00:00Z' };
  for (const update of completedFirst ? [completed, newer] : [newer, completed]) await sync(update);
  const read = (latest: string) => db.query(`select completed_at = $2::timestamptz as first_completion,
    session_rpe, player_note, client_updated_at = $3::timestamptz as newest
    from public.workout_sessions where id = $1`, [sessionId, row.completed_at, latest]);
  const expected = [{ first_completion: true, session_rpe: 9, player_note: 'Done', newest: true }];
  expect((await read(newer.client_updated_at)).rows).toEqual(expected);
  await sync({ ...newer, completed_at: '2026-11-16T13:00:00Z', client_updated_at: '2026-11-16T13:00:00Z' });
  expect((await read('2026-11-16T13:00:00Z')).rows).toEqual(expected);
});
