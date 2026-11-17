import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let player: string;
let other: string;
const id = '00000000-0000-0000-0000-000000000352';
const macros = { kcal: 100, protein: 2, carbs: 20, fat: 1 };
beforeAll(async () => {
  db = await createTestDb();
  ({ player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'player');
});
afterAll(async () => { await db?.close(); });

it('syncs snapshots, keeps newer writes, clears on untick and accepts legacy payloads', async () => {
  const row = { id, meal_id: null, log_date: '2026-11-03', swaps: {},
    completed_at: '2026-11-03T10:00:00Z', client_updated_at: '2026-11-03T10:00:00Z', eaten_macros: macros };
  const sync = (value: object) => asUser(db, player, tx => tx.query('select public.sync_meal_logs($1)', [[value]]));
  const read = async () => (await db.query('select eaten_macros,completed_at from public.meal_logs where id=$1', [id])).rows[0];
  await sync(row);
  expect(await read()).toMatchObject({ eaten_macros: macros });
  await sync({ ...row, eaten_macros: { ...macros, kcal: 999 }, client_updated_at: '2026-11-03T09:00:00Z' });
  expect(await read()).toMatchObject({ eaten_macros: macros });
  expect((await asUser(db, other, tx => tx.query('select id from public.meal_logs where id=$1', [id]))).rows).toEqual([]);
  await sync({ ...row, completed_at: null, client_updated_at: '2026-11-03T11:00:00Z' });
  expect(await read()).toEqual({ eaten_macros: null, completed_at: null });
  await sync({ ...row, eaten_macros: undefined, client_updated_at: '2026-11-03T12:00:00Z' });
  expect(await read()).toMatchObject({ eaten_macros: null });
  await sync({ ...row, eaten_macros: { ...macros, kcal: 200 }, client_updated_at: '2026-11-03T13:00:00Z' });
  expect(await read()).toMatchObject({ eaten_macros: { ...macros, kcal: 200 } });
});
