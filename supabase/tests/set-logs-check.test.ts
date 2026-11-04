import fs from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';
import { tenantFixture } from './cross-tenant-fixture';
import { uuidv7 } from '../../src/core/offline/ids';

let db: PGlite;
let tenant: Awaited<ReturnType<typeof tenantFixture>>;
const migration = fs.readFileSync(new URL('../migrations/0053_set_logs_check.sql', import.meta.url), 'utf8');
beforeAll(async () => {
  db = await createTestDb();
  const { captain, player } = await createCaptainWithPlayer(db);
  tenant = await tenantFixture(db, captain, player);
});
afterAll(async () => { await db?.close(); });

it('rejects new zero reps but accepts zero weight with positive reps', async () => {
  const insert = (reps: number) => asUser(db, tenant.player, tx => tx.query(`
    insert into public.set_logs (id, session_id, program_exercise_id, exercise_id, set_index,
      weight_kg, reps, completed_at, client_updated_at)
    values ($1, $2, $3, $4, 2, 0, $5, $6, $6)`,
  [uuidv7(Date.parse(TEST_NOW)), tenant.session, tenant.item, tenant.exercise, reps, TEST_NOW]));
  await expect(insert(0)).rejects.toThrow(/set_logs_reps_positive/);
  await expect(insert(1)).resolves.toBeDefined();
});

it('keeps existing zero-rep rows when the NOT VALID constraint is installed', async () => {
  await db.exec('alter table public.set_logs drop constraint set_logs_reps_positive');
  await db.query('update public.set_logs set reps = 0 where id = $1', [tenant.set]);
  await db.exec(migration);
  expect((await db.query('select reps from public.set_logs where id = $1', [tenant.set])).rows).toEqual([{ reps: 0 }]);
  await expect(db.query('update public.set_logs set reps = 0 where id = $1', [tenant.set])).rejects.toThrow(/set_logs_reps_positive/);
});

it('allows only the owning player to read their sessions and sets', async () => {
  const stranger = await createUser(db, 'player');
  for (const table of ['workout_sessions', 'set_logs']) {
    const owner = await asUser(db, tenant.player, tx => tx.query(`select id from public.${table}`));
    const other = await asUser(db, stranger, tx => tx.query(`select id from public.${table}`));
    expect(owner.rows.length).toBeGreaterThan(0);
    expect(other.rows).toEqual([]);
  }
});
