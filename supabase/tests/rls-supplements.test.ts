import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let otherCaptain: string;
let otherPlayer: string;
const supplement = '01900000-0000-7000-8000-000000000001';
const logId = '01900000-0000-8000-8000-000000000002';
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
const payload = (taken: boolean, timestamp: string) => JSON.stringify([{ id: logId, supplement_id: supplement,
  log_date: '2026-11-03', taken_at: taken ? timestamp : null, client_updated_at: timestamp, deleted_at: taken ? null : timestamp }]);

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: otherCaptain, player: otherPlayer } = await createCaptainWithPlayer(db));
});
afterAll(async () => { await db?.close(); });

it('allows prescriptions only from the player’s captain', async () => {
  const insert = (user: string, owner: string) => run(user, `insert into public.supplements
    (id, captain_id, player_id, name, dose, timing) values ($1,$2,$3,'Creatine','5 g','morning')`, [supplement, owner, player]);
  await expect(insert(otherCaptain, otherCaptain)).rejects.toThrow(/row-level security/);
  await expect(insert(player, player)).rejects.toThrow(/row-level security/);
  await insert(captain, captain);
  for (const user of [captain, player]) expect((await run(user, 'select * from public.supplements')).rows).toHaveLength(1);
  for (const user of [otherCaptain, otherPlayer]) expect((await run(user, 'select * from public.supplements')).rows).toHaveLength(0);
  expect((await run(player, "update public.supplements set dose='9 g' returning id")).rows).toHaveLength(0);
  expect((await run(captain, "update public.supplements set dose='6 g' returning id")).rows).toHaveLength(1);
});

it('checks field limits and timing', async () => {
  for (const sql of ["name = ''", "name = 'x' || repeat(' ',60)", "dose = repeat('x',41)", "notes = repeat('x',301)", "timing = 'invalid'"]) {
    await expect(run(captain, `update public.supplements set ${sql}`)).rejects.toThrow(/check constraint/);
  }
});

it('allows only the owner to tick; rejects spoofed player ids and cross-player supplements', async () => {
  const sql = 'select public.sync_supplement_logs($1::jsonb)';
  for (const user of [captain, otherCaptain, otherPlayer]) {
    await expect(run(user, sql, [payload(true, '2026-11-03T10:00:00Z')])).rejects.toThrow(/row-level security/);
  }
  await expect(run(player, `insert into public.supplement_logs
    (id,supplement_id,player_id,log_date,client_updated_at) values ($1,$2,$3,'2026-11-03',now())`,
  [logId, supplement, otherPlayer])).rejects.toThrow(/row-level security/);
  await run(player, sql, [payload(true, '2026-11-03T10:00:00Z')]);
  for (const user of [captain, player]) expect((await run(user, 'select * from public.supplement_logs')).rows).toHaveLength(1);
  for (const user of [otherCaptain, otherPlayer]) expect((await run(user, 'select * from public.supplement_logs')).rows).toHaveLength(0);
});

it('keeps unticks idempotent and rejects an older delayed tick', async () => {
  const sql = 'select public.sync_supplement_logs($1::jsonb)';
  await run(player, sql, [payload(false, '2026-11-03T11:00:00Z')]);
  await run(player, sql, [payload(false, '2026-11-03T11:00:00Z')]);
  await run(player, sql, [payload(true, '2026-11-03T10:00:00Z')]);
  expect((await run(captain, 'select taken_at from public.supplement_logs')).rows).toEqual([{ taken_at: null }]);
  expect((await run(captain, 'delete from public.supplement_logs returning id')).rows).toHaveLength(0);
  expect((await run(player, 'delete from public.supplement_logs returning id')).rows).toHaveLength(1);
});

it('denies anon and suspended users, and permits captain archiving', async () => {
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select * from public.supplements'); })).rejects.toThrow(/permission denied/);
  for (const user of [captain, player]) {
    await db.query('update public.profiles set suspended_at = now() where id = $1', [user]);
    try {
      expect((await run(user, 'select * from public.supplements')).rows).toHaveLength(0);
      expect((await run(user, 'select * from public.supplement_logs')).rows).toHaveLength(0);
      if (user === player) await expect(run(player, 'select public.sync_supplement_logs($1::jsonb)', [payload(true, '2026-11-03T12:00:00Z')])).rejects.toThrow(/row-level security|account suspended/);
      else expect((await run(captain, "update public.supplements set dose='8 g' returning id")).rows).toHaveLength(0);
    }
    finally { await db.query('update public.profiles set suspended_at = null where id = $1', [user]); }
  }
  expect((await run(otherCaptain, 'update public.supplements set archived_at=now() returning id')).rows).toHaveLength(0);
  expect((await run(captain, 'update public.supplements set archived_at=now() returning id')).rows).toHaveLength(1);
  await run(player, 'select public.sync_supplement_logs($1::jsonb)', [payload(true, '2026-11-03T12:00:00Z')]);
  expect((await run(player, 'select taken_at from public.supplement_logs where deleted_at is null')).rows).toHaveLength(1);
});
