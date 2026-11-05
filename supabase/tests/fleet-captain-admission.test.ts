import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb } from './harness';
import { createFleet, fleetId, fleetUser } from './fleet-fixture';
import type { Fleet } from './fleet-fixture';

let db: PGlite;
let fleet: Fleet;
beforeAll(async () => { db = await createTestDb(); fleet = await createFleet(db); });
afterAll(async () => { await db?.close(); });
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
const intake = { current_tool: 'whatsapp_excel', main_challenge: 'time_on_tables', players_range: '1-10' };

it.each(Array.from({ length: 30 }, (_, i) => i))('new captain %i submits intake and follows an admin review route', async index => {
  const user = await fleetUser(db, 60000 + index, index % 2 ? null : 'captain');
  if (index % 2) {
    expect((await run(user, 'select * from my_approval_route_profile()')).rows[0]).toMatchObject({ role_confirmed: false });
    await run(user, "select confirm_role('captain')");
  }
  const profile = () => run(user, 'select * from my_approval_route_profile()');
  expect((await profile()).rows).toEqual([{ role: 'captain', role_confirmed: true,
    suspended_at: null, is_admin: false, captain_status: 'pending' }]);
  await expect(run(user, "insert into programs(captain_id,title,is_template) values($1,'Premature',true)", [user]))
    .rejects.toMatchObject({ code: '42501' });
  expect((await run(user, `update profiles set captain_intake=$1,
    social='{"whatsapp":"+201012345678","instagram":"fleet"}'
    where id=$2 and captain_status='pending' and captain_intake is null returning captain_intake`, [intake, user])).rows)
    .toEqual([{ captain_intake: intake }]);
  expect((await profile()).rows[0]).toMatchObject({ captain_status: 'pending' });
  expect((await run(fleet.admin, 'select * from admin_pending_captains()')).rows)
    .toContainEqual(expect.objectContaining({ id: user, captain_intake: intake, whatsapp: '+201012345678' }));
  const status = index % 3 === 0 ? 'rejected' : 'approved';
  await expect(run(user, 'select admin_review_captain($1,$2)', [user, status])).rejects.toMatchObject({ code: '42501' });
  await run(fleet.admin, 'select admin_review_captain($1,$2)', [user, status]);
  expect((await profile()).rows[0]).toMatchObject({ captain_status: status });
  expect((await db.query('select action from admin_audit_log where target_id=$1', [user])).rows)
    .toEqual([{ action: status === 'approved' ? 'approve_captain' : 'reject_captain' }]);
  expect((await run(user, "select id from notifications where type='captain_approved'")).rows)
    .toHaveLength(status === 'approved' ? 1 : 0);
});

it('creates and redeems an invite once, expires another and leaves failed redemptions untouched', async () => {
  const captain = fleet.captains[0];
  if (!captain) throw new Error('Missing captain');
  const player = await fleetUser(db, 61000, 'player');
  for (const [code, expires] of [['valid', '2026-11-04'], ['expired', '2026-11-02']]) await run(captain.id,
    `insert into coach_invites(captain_id,code,access_until,expires_at) values($1,$2,'2026-12-03',$3)`,
    [captain.id, code, expires]);
  await expect(run(player, "select redeem_invite('expired')")).rejects.toMatchObject({ code: 'P0002' });
  await run(player, "select redeem_invite('valid')");
  await expect(run(player, "select redeem_invite('valid')")).rejects.toMatchObject({ code: 'P0002' });
  expect((await run(captain.id, "select redeemed_by from coach_invites where code='expired'")).rows).toEqual([{ redeemed_by: null }]);
  expect((await run(captain.id, 'select player_id from captain_roster()')).rows).toEqual([{ player_id: player }]);
});

it('keeps an invited player pending until the captain activates their package', async () => {
  const captain = fleet.captains[10];
  if (!captain) throw new Error('Missing captain');
  const player = await fleetUser(db, 61001, 'player');
  await run(captain.id, `insert into coach_invites(captain_id,code,access_until)
    values($1,'activation-gate','2026-12-03')`, [captain.id]);
  await run(player, "select redeem_invite('activation-gate')");
  const actual = await run(player, 'select pending,access_until::text,player_can_write() as can_write from coach_clients');
  expect(actual.rows).toEqual([{ pending: true, access_until: '2026-12-03', can_write: false }]);
  const scan = fleetId(61002);
  const write = () => run(player, "insert into body_scans(id,scan_date,weight_kg) values($1,'2026-11-03',80)", [scan]);
  await expect(write()).rejects.toMatchObject({ code: '42501' });
  const link = await asUser(db, player, tx => tx.query<{ id: string }>('select id from coach_clients'));
  await run(captain.id, "select activate_player($1,null,'days',7,100,100,false)", [link.rows[0]?.id]);
  expect((await run(player, 'select pending,access_until::text,player_can_write() as can_write from coach_clients')).rows)
    .toEqual([{ pending: false, access_until: '2026-11-10', can_write: true }]);
  await write();
  expect((await run(player, 'select id from body_scans')).rows).toEqual([{ id: scan }]);
});

it('reserves join-request slots, accepts and declines them, and rejects another captain resolving them', async () => {
  const captain = fleet.captains[20];
  if (!captain) throw new Error('Missing captain');
  for (const [n, status] of [[62000, 'accepted'], [62001, 'declined']] as const) {
    const player = await fleetUser(db, n, 'player');
    const request = fleetId(n + 100);
    await run(player, 'insert into coach_join_requests(id,captain_id,player_id) values($1,$2,$3)', [request, captain.id, player]);
    expect((await run(player, 'select pending,player_can_write() as can_write from coach_clients')).rows)
      .toEqual([{ pending: true, can_write: false }]);
    await expect(run(fleet.captains[0]?.id ?? '', 'select resolve_coach_join_request($1,$2,$3)', [request, status, request]))
      .rejects.toMatchObject({ code: '42501' });
    await run(captain.id, 'select resolve_coach_join_request($1,$2,$3)', [request, status, request]);
    expect((await run(player, 'select status from coach_join_requests where id=$1', [request])).rows).toEqual([{ status }]);
    expect((await run(captain.id, 'select player_id from captain_roster() where player_id=$1', [player])).rows)
      .toHaveLength(status === 'accepted' ? 1 : 0);
    if (status === 'accepted') {
      await run(captain.id, "select activate_player($1,null,'days',30,100,100,false)", [request]);
      expect((await run(player, 'select player_can_write() as allowed')).rows).toEqual([{ allowed: true }]);
    }
  }
});

it.each([4, 5, 6, 7])('enforces captain %i tier cap for invites and join requests, including pending slots', async index => {
  const captain = fleet.captains[index];
  if (!captain) throw new Error('Missing captain');
  for (let j = captain.players.length; j <= captain.limit; j++) {
    const player = await fleetUser(db, 70000 + index * 1000 + j, 'player');
    const code = `cap-${index}-${j}`;
    await run(captain.id, "insert into coach_invites(captain_id,code,access_until) values($1,$2,'2026-12-03')", [captain.id, code]);
    if (j < captain.limit) await run(player, 'select redeem_invite($1)', [code]);
    else {
      await expect(run(player, 'select redeem_invite($1)', [code])).rejects.toMatchObject({ code: 'P0001' });
      await expect(run(player, 'insert into coach_join_requests(id,captain_id,player_id) values($1,$2,$3)',
        [fleetId(80000 + index), captain.id, player])).rejects.toMatchObject({ code: 'P0001' });
      expect((await run(captain.id, 'select redeemed_at from coach_invites where code=$1', [code])).rows).toEqual([{ redeemed_at: null }]);
      expect((await db.query('select id from coach_join_requests where player_id=$1', [player])).rows).toEqual([]);
    }
  }
  expect((await run(captain.id, 'select * from captain_roster()')).rows).toHaveLength(captain.limit);
});
