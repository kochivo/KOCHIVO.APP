import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, TEST_NOW } from './harness';
import { createFleet, fleetId } from './fleet-fixture';
import type { Fleet } from './fleet-fixture';

let db: PGlite;
let fleet: Fleet;
beforeAll(async () => {
  db = await createTestDb();
  fleet = await createFleet(db);
  await db.query("insert into exercises(id,name_en,body_part) values($1,'Fleet exercise','chest')", [fleetId(99000)]);
  for (const captain of fleet.captains) {
    const player = captain.players[0];
    if (!player) continue;
    const session = fleetId(100000 + captain.index);
    // Privileged seeds represent preexisting history, including history before suspension.
    await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
      values($1,$2,'2026-11-03',$3,$3)`, [session, player.id, TEST_NOW]);
    await db.query(`insert into set_logs(id,player_id,session_id,exercise_id,set_index,completed_at,client_updated_at)
      values($1,$2,$3,$4,1,$5,$5)`, [fleetId(101000 + captain.index), player.id, session, fleetId(99000), TEST_NOW]);
    await db.query(`insert into meal_logs(id,player_id,log_date,client_updated_at)
      values($1,$2,'2026-11-03',$3)`, [fleetId(102000 + captain.index), player.id, TEST_NOW]);
    await db.query(`insert into daily_checks(id,player_id,log_date,client_updated_at)
      values($1,$2,'2026-11-03',$3)`, [fleetId(103000 + captain.index), player.id, TEST_NOW]);
    if (captain.status === 'approved' && !captain.suspended) await asUser(db, captain.id,
      tx => tx.query('select collect_player_payment($1,10)', [player.id]));
  }
});
afterAll(async () => { await db?.close(); });

it.each(Array.from({ length: 30 }, (_, i) => i))('captain %i cannot read another captain\'s players, content, logs, payments or notifications', async index => {
  const captain = fleet.captains[index];
  if (!captain) throw new Error('Missing captain');
  const others = fleet.players.filter(p => p.captainId !== captain.id).map(p => p.id);
  const run = (sql: string, params: unknown[] = []) => asUser(db, captain.id, tx => tx.query(sql, params));
  expect((await run('select id from profiles where id=any($1::uuid[])', [others])).rows).toEqual([]);
  const predicates = [
    ['coach_clients', 'captain_id<>$1 and archived_at is null'],
    ['programs', 'captain_id<>$1'], ['nutrition_plans', 'captain_id<>$1'],
    ['player_payments', 'captain_id<>$1'], ['payment_collections', 'captain_id<>$1'],
    ['notifications', 'user_id<>$1'],
  ];
  for (const [table, predicate] of predicates) {
    expect((await run(`select id from ${table} where ${predicate}`, [captain.id])).rows, table).toEqual([]);
    expect((await db.query(`select id from ${table} where ${predicate}`, [captain.id])).rows.length).toBeGreaterThan(0);
  }
  for (const table of ['workout_sessions', 'set_logs', 'meal_logs', 'daily_checks']) {
    const sql = `select id from ${table} where player_id=any($1::uuid[])`;
    expect((await db.query(sql, [others])).rows.length).toBeGreaterThan(0);
    expect((await run(sql, [others])).rows, table).toEqual([]);
    const own = captain.players[0];
    if (own && captain.status === 'approved' && !captain.suspended) {
      expect((await run(`select id from ${table} where player_id=$1`, [own.id])).rows, table).toHaveLength(1);
    }
  }
});

it('retains an over-limit roster after a paid plan expires and reports Entry usage accurately', async () => {
  const result = await asUser(db, fleet.overLimitCaptain, tx => tx.query(`select current_tier($1) as tier,
    (select count(*)::int from captain_roster()) as used,
    (select player_limit from plan_tiers where tier=current_tier($1)) as capacity`, [fleet.overLimitCaptain]));
  expect(result.rows).toEqual([{ tier: 'entry', used: 20, capacity: 5 }]);
});
