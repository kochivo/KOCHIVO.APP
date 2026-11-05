import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb } from './harness';
import { createFleet, FLEET_TODAY } from './fleet-fixture';
import type { Fleet } from './fleet-fixture';

let db: PGlite;
let fleet: Fleet;
beforeAll(async () => { db = await createTestDb(); fleet = await createFleet(db); });
afterAll(async () => { await db?.close(); });

it('creates 30 confirmed captains across every tier, including three pending, one rejected and one suspended', async () => {
  expect(fleet.captains).toHaveLength(30);
  expect(new Set(fleet.captains.map(c => c.tier))).toEqual(new Set(['entry', 'champion', 'legend', 'empire']));
  expect(fleet.captains.filter(c => c.status === 'pending')).toHaveLength(3);
  expect(fleet.captains.filter(c => c.status === 'rejected')).toHaveLength(1);
  expect(fleet.captains.filter(c => c.suspended)).toHaveLength(1);
  expect(new Set(fleet.players.map(p => p.state))).toEqual(new Set(['active', 'pending', 'frozen', 'expired']));
  expect(new Set(fleet.players.map(p => p.kind))).toEqual(new Set(['days', 'sessions']));
  expect(new Set(fleet.players.map(p => p.joinedBy))).toEqual(new Set(['invite', 'request']));
  expect((await db.query('select id from profiles where role=\'captain\' and not role_confirmed')).rows).toEqual([]);
});

it.each(Array.from({ length: 30 }, (_, i) => i))('captain %i sees exactly their own roster and tier usage', async index => {
  const captain = fleet.captains[index];
  if (!captain) throw new Error('Missing captain');
  const result = await asUser(db, captain.id, tx => tx.query<{ player_id: string }>('select * from captain_roster()'));
  const blocked = captain.status !== 'approved' || captain.suspended;
  expect(result.rows.map(r => r.player_id).sort()).toEqual(blocked ? [] : captain.players.map(p => p.id).sort());
  if (blocked) return;
  const summary = await asUser(db, captain.id, tx => tx.query(`select t.tier,t.player_limit,
    (select count(*)::int from coach_clients where captain_id=$1 and archived_at is null) as used
    from plan_tiers t where tier=current_tier($1)`, [captain.id]));
  expect(summary.rows).toEqual([{ tier: captain.tier, player_limit: captain.limit, used: captain.players.length }]);
  expect(captain.limit).toBeGreaterThan(0);
});

it('covers the 0, 1 and 50-player dashboard shapes without a zero denominator', async () => {
  for (const count of [0, 1, 50]) {
    const captain = fleet.captains.find(c => c.status === 'approved' && !c.suspended && c.players.length === count);
    expect(captain).toBeDefined();
    if (!captain) throw new Error('Missing dashboard shape');
    expect((await asUser(db, captain.id, tx => tx.query('select * from captain_roster()'))).rows).toHaveLength(count);
    expect(captain.limit).toBeGreaterThanOrEqual(count);
  }
});

it.each([0, 19])('dashboard RPCs stay scoped and repeat safely for captain %i', async index => {
  const captain = fleet.captains[index];
  if (!captain) throw new Error('Missing captain');
  const run = (sql: string, params: unknown[] = []) => asUser(db, captain.id, tx => tx.query<Record<string, unknown>>(sql, params));
  const radar = await run('select * from captain_dropout_radar($1)', [FLEET_TODAY]);
  expect(radar.rows.length).toBeLessThanOrEqual(captain.players.length);
  for (const row of radar.rows) {
    expect(captain.players.map(p => p.id)).toContain(row.player_id);
    expect(['no_program', 'no_activity', 'never_started']).toContain(row.reason);
    expect(Number(row.days)).toBeGreaterThanOrEqual(0);
  }
  const requests = await run('select * from pending_coach_join_requests()');
  const expected = await db.query<{ id: string }>('select id from coach_join_requests where captain_id=$1 and status=\'pending\' order by created_at,id', [captain.id]);
  expect(requests.rows.map(r => r.id)).toEqual(expected.rows.map(r => r.id));
  await run('select refresh_inactive_alerts()');
  const alerts = await run("select payload from notifications where type='player_inactive' order by id");
  await run('select refresh_inactive_alerts()');
  expect((await run("select payload from notifications where type='player_inactive' order by id")).rows).toEqual(alerts.rows);
  if (captain.players.length === 0) expect(alerts.rows).toEqual([]);
  for (const row of alerts.rows) expect(captain.players.map(p => p.id)).toContain((row.payload as { player_id: string }).player_id);
});

it.each([25, 26, 27, 28, 29])('blocks templates and hides the public page for unavailable captain %i', async index => {
  const captain = fleet.captains[index];
  if (!captain) throw new Error('Missing captain');
  for (const table of ['programs', 'nutrition_plans']) await expect(asUser(db, captain.id, tx => tx.query(
    `insert into ${table}(captain_id,title,is_template) values($1,'Blocked',true)`, [captain.id])))
    .rejects.toMatchObject({ code: '42501' });
  expect((await db.query('select * from coach_public_profile($1)', [`fleet-${index}`])).rows).toEqual([]);
});

// BUG T-089-A-2: inactivity refresh includes frozen and pending relationships before any training is expected.
it.fails('does not send inactive-player alerts for frozen or unactivated packages', async () => {
  const captain = fleet.captains[19];
  if (!captain) throw new Error('Missing captain');
  await asUser(db, captain.id, tx => tx.query('select refresh_inactive_alerts()'));
  const alerts = await asUser(db, captain.id, tx => tx.query<{ player: string }>(
    "select payload->>'player_id' as player from notifications where type='player_inactive'"));
  const excluded = captain.players.filter(p => p.state === 'frozen' || p.state === 'pending').map(p => p.id);
  expect(excluded.length).toBeGreaterThan(0);
  expect(alerts.rows.filter(row => excluded.includes(row.player))).toEqual([]);
});
