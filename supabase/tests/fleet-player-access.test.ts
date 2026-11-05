import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, TEST_NOW } from './harness';
import { createFleet, fleetId, fleetUser } from './fleet-player-fixture';
import type { FleetPlayer } from './fleet-player-fixture';
import { playerContent } from './fleet-player-content';

let db: PGlite;
let fleet: Awaited<ReturnType<typeof createFleet>>;
let sequence = 0;
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
beforeAll(async () => { db = await createTestDb(); fleet = await createFleet(db); });
afterAll(async () => { await db?.close(); });

it('joins by invite and request; request content stays private until captain activation', async () => {
  const captain = fleet.captains[0];
  if (!captain) throw new Error('Missing empty captain');
  const player = await fleetUser(db, 'join-request', 'player');
  const request = await fleetId('join-request');
  await run(player, 'insert into coach_join_requests(id,captain_id,player_id) values ($1,$2,$3)', [request, captain.id, player]);
  const trainee: FleetPlayer = { id: player, captain: captain.id, link: request, state: 'pending', kind: 'days', joinedBy: 'request' };
  const content = await playerContent(db, trainee);
  for (const table of ['programs', 'program_days', 'program_exercises', 'nutrition_plans', 'meals', 'meal_items', 'supplements']) {
    expect((await run(player, `select id from ${table}`)).rows).toEqual([]);
  }
  await run(captain.id, "select resolve_coach_join_request($1,'accepted',$2)", [request, await fleetId('unused-link')]);
  expect((await run(player, 'select pending from coach_clients')).rows).toEqual([{ pending: true }]);
  expect((await run(player, 'select id from programs')).rows).toEqual([]);
  await run(captain.id, "select activate_player($1,null,'days',30,100,100,false)", [request]);
  expect((await run(player, 'select id from programs')).rows).toEqual([{ id: content.program }]);
  const invited = await fleetUser(db, 'join-invite', 'player');
  const invite = await fleetId('join-invite');
  await run(captain.id, `insert into coach_invites(id,captain_id,code,access_until)
    values ($1,$2,'fleet-new-invite','2026-12-03')`, [invite, captain.id]);
  await run(invited, "select redeem_invite('fleet-new-invite')");
  expect((await run(invited, 'select captain_id,pending from coach_clients')).rows).toEqual([{ captain_id: captain.id, pending: true }]);
  await expect(run(invited, "select redeem_invite('fleet-new-invite')")).rejects.toMatchObject({ code: 'P0002' });
});

it('refuses invite redemption at the entry cap and preserves the unused invite', async () => {
  const captain = fleet.overLimitCaptain;
  if (!captain) throw new Error('Missing capped captain');
  const player = await fleetUser(db, 'over-cap', 'player');
  const id = await fleetId('over-cap-invite');
  await run(captain.id, `insert into coach_invites(id,captain_id,code,access_until)
    values ($1,$2,'fleet-over-cap','2026-12-03')`, [id, captain.id]);
  await expect(run(player, "select redeem_invite('fleet-over-cap')")).rejects.toMatchObject({ code: 'P0001' });
  expect((await db.query('select redeemed_at from coach_invites where id=$1', [id])).rows).toEqual([{ redeemed_at: null }]);
});

it('expired invites cannot attach a player', async () => {
  const captain = fleet.captains[0];
  if (!captain) throw new Error('Missing invite captain');
  const player = await fleetUser(db, 'expired-invite', 'player');
  const id = await fleetId('expired-invite');
  await run(captain.id, `insert into coach_invites(id,captain_id,code,access_until,expires_at)
    values ($1,$2,'fleet-expired','2026-12-03','2026-11-02T00:00:00Z')`, [id, captain.id]);
  await expect(run(player, "select redeem_invite('fleet-expired')")).rejects.toMatchObject({ code: 'P0002' });
  expect((await run(player, 'select id from coach_clients')).rows).toEqual([]);
});

for (const state of ['pending', 'frozen', 'expired'] as const) {
  it(`${state} players cannot sync new logs but can read their own history across captains`, async () => {
    for (const captain of fleet.captains.filter(c => c.status === 'approved' && !c.suspended)) {
      const player = captain.players.find(p => p.state === state);
      if (!player) continue;
      const c = await playerContent(db, player);
      const session = await fleetId('history-session', player.id);
      await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
        values ($1,$2,'2026-10-20','2026-10-20T08:00:00Z',$3)`, [session, player.id, TEST_NOW]);
      expect((await run(player.id, 'select id from workout_sessions')).rows).toEqual([{ id: session }]);
      const historyRows = {
        set_logs: { session_id: session, program_exercise_id: c.item, exercise_id: c.exercise,
          set_index: 1, weight_kg: 50, reps: 8, completed_at: TEST_NOW, client_updated_at: TEST_NOW },
        meal_logs: { meal_id: c.meal, log_date: '2026-10-20', client_updated_at: TEST_NOW },
        daily_checks: { log_date: '2026-10-20', water_ml: 250, client_updated_at: TEST_NOW },
        supplement_logs: { supplement_id: c.supplement, log_date: '2026-10-20', taken_at: TEST_NOW, client_updated_at: TEST_NOW },
        body_scans: { scan_date: '2026-10-20', weight_kg: 80 },
      };
      for (const [table, values] of Object.entries(historyRows)) {
        const id = await fleetId('restricted-history', player.id, table);
        const row = { id, player_id: player.id, ...values };
        const columns = Object.keys(row);
        await db.query(`insert into ${table}(${columns.join(',')})
          values (${columns.map((_, i) => `$${i + 1}`).join(',')})`, Object.values(row));
        expect((await run(player.id, `select id from ${table}`)).rows).toEqual([{ id }]);
      }
      expect((await run(player.id, 'select id from programs')).rows).toEqual([]);
      const payloads = {
        workout_sessions: { training_date: '2026-11-03', started_at: TEST_NOW },
        set_logs: { session_id: session, program_exercise_id: c.item, exercise_id: c.exercise,
          set_index: 1, weight_kg: 50, reps: 8, completed_at: TEST_NOW },
        meal_logs: { meal_id: c.meal, log_date: '2026-11-03', swaps: {} },
        daily_checks: { log_date: '2026-11-03', sleep_hours: 8, soreness: 2, water_ml: 250 },
        supplement_logs: { supplement_id: c.supplement, log_date: '2026-11-03', taken_at: TEST_NOW },
      };
      for (const [table, row] of Object.entries(payloads)) {
        const id = await fleetId('blocked', player.id, table);
        await expect(run(player.id, `select sync_${table}($1)`, [JSON.stringify([{ ...row, id, client_updated_at: TEST_NOW }])]))
          .rejects.toMatchObject({ code: '42501' });
      }
    }
  });
  it(`${state} players cannot create new body scans`, async () => {
    const player = fleet.players.find(p => p.state === state);
    if (!player) throw new Error('Missing restricted player');
    const id = await fleetId('blocked-scan', state);
    await expect(run(player.id, "insert into body_scans(id,scan_date,weight_kg) values ($1,'2026-11-03',80)", [id]))
      .rejects.toMatchObject({ code: '42501' });
  });
}

it('active players sync supplement checks and daily readiness; only their captain can decide', async () => {
  for (const captain of fleet.captains.filter(c => c.status === 'approved' && !c.suspended)) {
    const player = captain.players.find(p => p.state === 'active');
    if (!player) continue;
    const c = await playerContent(db, player);
    for (const [table, values] of [
      ['supplement_logs', { supplement_id: c.supplement, taken_at: TEST_NOW }],
      ['daily_checks', { sleep_hours: 8, soreness: 2, water_ml: 500 }],
    ] as const) {
      const id = await fleetId('wellness', table, player.id);
      const rows = [{ ...values, id, log_date: '2026-11-03', client_updated_at: TEST_NOW }];
      await run(player.id, `select sync_${table}($1)`, [JSON.stringify(rows)]);
      await run(player.id, `select sync_${table}($1)`, [JSON.stringify(rows)]);
      expect((await run(captain.id, `select id from ${table} where player_id=$1`, [player.id])).rows).toEqual([{ id }]);
    }
    const decision = await fleetId('readiness', player.id);
    const sql = `insert into readiness_decisions(id,captain_id,player_id,decision_date,decision)
      values ($1,$2,$3,'2026-11-03','reduce')`;
    await expect(run(player.id, sql, [decision, captain.id, player.id])).rejects.toMatchObject({ code: '42501' });
    const other = fleet.captains.find(c => c.id !== captain.id && c.status === 'approved' && !c.suspended);
    if (!other) throw new Error('Missing unrelated captain');
    await expect(run(other.id, sql, [decision, other.id, player.id])).rejects.toMatchObject({ code: '42501' });
    await run(captain.id, sql, [decision, captain.id, player.id]);
    expect((await run(player.id, 'select decision from readiness_decisions')).rows).toEqual([{ decision: 'reduce' }]);
    const scan = await fleetId('active-scan', player.id);
    await run(player.id, "insert into body_scans(id,scan_date,weight_kg) values ($1,'2026-11-03',80)", [scan]);
    expect((await run(captain.id, 'select id from body_scans where player_id=$1', [player.id])).rows).toEqual([{ id: scan }]);
  }
});

async function movePlayer() {
  const suffix = String(++sequence);
  const player = await fleetUser(db, `moving-${suffix}`, 'player');
  const oldCaptain = fleet.captains[20], newCaptain = fleet.captains[10];
  if (!oldCaptain || !newCaptain) throw new Error('Missing move captains');
  const link = await fleetId('move-link', suffix);
  await db.query("insert into coach_clients(id,captain_id,player_id,access_until) values ($1,$2,$3,'2026-12-03')", [link, oldCaptain.id, player]);
  const c = await playerContent(db, { id: player, captain: oldCaptain.id, link, state: 'active', kind: 'days', joinedBy: 'invite' });
  const before = await fleetId('before-move', suffix), after = await fleetId('after-move', suffix);
  const sync = (id: string, date: string, time: string) => run(player, 'select sync_workout_sessions($1)', [JSON.stringify([
    { id, training_date: date, started_at: time, client_updated_at: time },
  ])]);
  await sync(before, '2026-11-01', '2026-11-01T08:00:00Z');
  const history: Record<string, string> = { workout_sessions: before };
  const payloads = {
    set_logs: { session_id: before, program_exercise_id: c.item, exercise_id: c.exercise,
      set_index: 1, weight_kg: 50, reps: 8, completed_at: TEST_NOW },
    meal_logs: { meal_id: c.meal, log_date: '2026-11-01', swaps: {} },
    daily_checks: { log_date: '2026-11-01', water_ml: 250 },
    supplement_logs: { supplement_id: c.supplement, log_date: '2026-11-01', taken_at: TEST_NOW },
  };
  for (const [table, row] of Object.entries(payloads)) {
    const id = await fleetId('move-history', suffix, table);
    history[table] = id;
    await run(player, `select sync_${table}($1)`, [JSON.stringify([{ ...row, id, client_updated_at: TEST_NOW }])]);
  }
  const scan = await fleetId('move-scan', suffix);
  await run(player, "insert into body_scans(id,scan_date,weight_kg) values ($1,'2026-11-01',80)", [scan]);
  history.body_scans = scan;
  await run(oldCaptain.id, 'update coach_clients set archived_at=now() where id=$1', [link]);
  const invite = await fleetId('move-invite', suffix);
  await run(newCaptain.id, `insert into coach_invites(id,captain_id,code,access_until)
    values ($1,$2,$3,'2026-12-03')`, [invite, newCaptain.id, `move-${suffix}`]);
  await run(player, 'select redeem_invite($1)', [`move-${suffix}`]);
  const newLink = await asUser(db, player, tx => tx.query<{ id: string }>('select id from coach_clients where archived_at is null'));
  await run(newCaptain.id, "select activate_player($1,null,'days',30,0,0,true)", [newLink.rows[0]?.id]);
  await sync(after, '2026-11-03', '2026-11-03T11:00:00Z');
  return { player, before, after, history, oldCaptain: oldCaptain.id, newCaptain: newCaptain.id };
}

it('a move revokes the old captain while preserving player history', async () => {
  const moved = await movePlayer();
  expect((await run(moved.oldCaptain, 'select id from workout_sessions where player_id=$1', [moved.player])).rows).toEqual([]);
  for (const [table, id] of Object.entries(moved.history)) {
    expect((await run(moved.oldCaptain, `select id from ${table} where id=$1`, [id])).rows).toEqual([]);
    expect((await run(moved.player, `select id from ${table} where id=$1`, [id])).rows).toEqual([{ id }]);
  }
  expect((await run(moved.player, 'select id from workout_sessions')).rows).toHaveLength(2);
  expect((await run(moved.newCaptain, 'select id from workout_sessions where id=$1', [moved.after])).rows).toEqual([{ id: moved.after }]);
});

for (const table of ['workout_sessions', 'set_logs', 'meal_logs', 'daily_checks', 'supplement_logs', 'body_scans']) {
  // BUG T-089-B-2: current-captain read policies expose history without a relationship start boundary.
  it.fails(`a new captain cannot read pre-move ${table}`, async () => {
    const moved = await movePlayer();
    expect((await run(moved.newCaptain, `select id from ${table} where id=$1`, [moved.history[table]])).rows).toEqual([]);
  });
}

it('expired access has three read-only grace days, then hides content while keeping history', async () => {
  const player = fleet.players.find(p => p.state === 'expired');
  if (!player) throw new Error('Missing expired player');
  await db.query("update coach_clients set access_until='2026-11-02' where id=$1", [player.link]);
  expect((await run(player.id, 'select player_can_read() as read,player_can_write() as write')).rows)
    .toEqual([{ read: true, write: false }]);
  expect((await run(player.id, 'select id from programs')).rows).toHaveLength(1);
  expect((await run(player.id, 'select id from nutrition_plans')).rows).toHaveLength(1);
  await db.query("update coach_clients set access_until='2026-10-30' where id=$1", [player.link]);
  expect((await run(player.id, 'select id from programs')).rows).toEqual([]);
  expect((await run(player.id, 'select id from nutrition_plans')).rows).toEqual([]);
  expect((await run(player.id, 'select id from workout_sessions')).rows).toHaveLength(1);
});
