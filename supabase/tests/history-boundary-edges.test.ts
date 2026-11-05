import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });

const check = (player: string, date: string) => db.query(
  'insert into daily_checks(id,player_id,log_date,client_updated_at) values (gen_random_uuid(),$1,$2,now())', [player, date]);

it('shows the check-in of the week a player joined mid-week, but not an older week', async () => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-11-04');
  for (const week of ['2026-10-31', '2026-10-24']) {
    await db.query('insert into check_ins(captain_id,player_id,week_start) values ($1,$2,$3)', [captain, player, week]);
  }
  const rows = await asUser(db, captain, tx => tx.query<{ week_start: Date }>(
    'select week_start from check_ins where player_id = $1', [player]));
  expect(rows.rows.map(row => row.week_start)).toEqual([new Date('2026-10-31')]);
});

it('keeps seeded demo history visible to the demo captain', async () => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-11-03');
  await db.query("update profiles set demo_expires_at = now() + interval '1 day' where id = $1", [captain]);
  await check(player, '2026-10-30');
  const rows = await asUser(db, captain, tx => tx.query('select log_date from daily_checks where player_id = $1', [player]));
  expect(rows.rows).toHaveLength(1);
});

it('hides pre-link daily checks from a regular captain', async () => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-11-03');
  await check(player, '2026-10-30');
  const rows = await asUser(db, captain, tx => tx.query('select log_date from daily_checks where player_id = $1', [player]));
  expect(rows.rows).toEqual([]);
});
