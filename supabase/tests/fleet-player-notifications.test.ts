import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, TEST_NOW } from './harness';
import { createFleet, fleetId } from './fleet-player-fixture';
import { playerContent } from './fleet-player-content';

let db: PGlite;
let fleet: Awaited<ReturnType<typeof createFleet>>;
const content = new Map<string, Awaited<ReturnType<typeof playerContent>>>();
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
beforeAll(async () => {
  db = await createTestDb(); fleet = await createFleet(db);
  for (const player of fleet.players) content.set(player.id, await playerContent(db, player));
});
afterAll(async () => { await db?.close(); });

it('reminds exactly active players on their scheduled day; retries and reading never duplicate reminders', async () => {
  await db.query("select queue_workout_reminders('2026-11-03')");
  const expected = fleet.players.filter(p => p.state === 'active').map(p => p.id).sort();
  const recipients = async () => (await db.query<{ user_id: string }>(
    "select user_id from notifications where type='workout_reminder' order by user_id")).rows.map(row => row.user_id);
  expect(await recipients()).toEqual(expected);
  for (const player of fleet.players) {
    const rows = (await run(player.id, "select user_id,payload from notifications where type='workout_reminder'")).rows;
    expect(rows).toEqual(player.state === 'active' ? [{ user_id: player.id,
      payload: { day_title: 'Training', program_id: content.get(player.id)?.program, training_date: '2026-11-03' } }] : []);
    await run(player.id, "update notifications set is_read=true where type='workout_reminder'");
  }
  await db.query("select queue_workout_reminders('2026-11-03')");
  expect(await recipients()).toEqual(expected);
});

it('skips completed days, rest days and suspended players, and protects the scheduler RPC', async () => {
  const active = fleet.players.filter(p => p.state === 'active').slice(0, 3);
  const [completed, rest, suspended] = active;
  if (!completed || !rest || !suspended) throw new Error('Missing reminder controls');
  await db.query("delete from notifications where type='workout_reminder'");
  const id = await fleetId('reminder-completed');
  await run(completed.id, 'select sync_workout_sessions($1)', [JSON.stringify([{ id, training_date: '2026-11-03',
    started_at: TEST_NOW, completed_at: TEST_NOW, client_updated_at: TEST_NOW }])]);
  await db.query('delete from program_exercises where day_id=$1', [content.get(rest.id)?.day]);
  await db.query('update program_days set is_rest_day=true where id=$1', [content.get(rest.id)?.day]);
  await db.query('update profiles set suspended_at=now() where id=$1', [suspended.id]);
  try {
    await db.query("select queue_workout_reminders('2026-11-03')");
    const rows = (await db.query("select user_id from notifications where type='workout_reminder' and user_id=any($1::uuid[])",
      [active.map(p => p.id)])).rows;
    expect(rows).toEqual([]);
    await expect(run(completed.id, "select queue_workout_reminders('2026-11-03')")).rejects.toMatchObject({ code: '42501' });
  } finally { await db.query('update profiles set suspended_at=null where id=$1', [suspended.id]); }
});

it('program and nutrition updates notify only the assigned player across all captains', async () => {
  for (const captain of fleet.captains.filter(c => c.status === 'approved' && !c.suspended)) {
    const player = captain.players.find(p => p.state === 'active');
    if (!player) continue;
    const c = content.get(player.id);
    if (!c) throw new Error('Missing player content');
    await db.query("delete from notifications where user_id=$1 and type in ('plan_assigned','nutrition_updated')", [player.id]);
    await run(captain.id, "update programs set status='draft' where id=$1", [c.program]);
    await run(captain.id, "update programs set status='active' where id=$1", [c.program]);
    await run(captain.id, 'update nutrition_plans set target_kcal=2200 where id=$1', [c.plan]);
    expect((await run(player.id, "select type from notifications where type in ('plan_assigned','nutrition_updated') order by type")).rows)
      .toEqual([{ type: 'nutrition_updated' }, { type: 'plan_assigned' }]);
    const notifications = (await db.query<{ id: string; user_id: string }>(
      "select id,user_id from notifications where (payload->>'plan_id'=$1 or payload->>'plan_id'=$2)", [c.program, c.plan])).rows;
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.every(n => n.user_id === player.id)).toBe(true);
    const other = fleet.players.find(p => p.captain !== captain.id);
    if (!other) throw new Error('Missing unrelated player');
    for (const reader of [other.id, captain.id]) expect((await run(reader,
      'select id from notifications where id=any($1::uuid[])', [notifications.map(n => n.id)])).rows).toEqual([]);
  }
});

it('feedback and depleted PT package notifications reach only the owning captain and are idempotent', async () => {
  for (const captain of fleet.captains.filter(c => c.status === 'approved' && !c.suspended)) {
    const player = captain.players.find(p => p.state === 'active' && p.kind === 'sessions');
    if (!player) continue;
    await db.query('update coach_clients set sessions_left=1 where id=$1', [player.link]);
    const id = await fleetId('feedback-session', player.id);
    const row = { id, training_date: '2026-11-03', started_at: TEST_NOW, completed_at: TEST_NOW,
      session_rpe: 9, player_note: 'Pain during press', client_updated_at: TEST_NOW };
    for (let retry = 0; retry < 2; retry++) await run(player.id, 'select sync_workout_sessions($1)', [JSON.stringify([row])]);
    expect((await run(captain.id, "select type from notifications where payload->>'session_id'=$1 order by type", [id])).rows)
      .toEqual([{ type: 'sessions_used_up' }, { type: 'workout_feedback' }]);
    expect((await run(player.id, "select id from notifications where payload->>'session_id'=$1", [id])).rows).toEqual([]);
    const other = fleet.captains.find(c => c.id !== captain.id);
    if (!other) throw new Error('Missing unrelated captain');
    expect((await run(other.id, "select id from notifications where payload->>'session_id'=$1", [id])).rows).toEqual([]);
    expect((await db.query('select sessions_left from coach_clients where id=$1', [player.link])).rows).toEqual([{ sessions_left: 0 }]);
  }
});
