import type { PGlite } from '@electric-sql/pglite';
import { asUser, TEST_NOW } from './harness';
import { seedFleetContent } from './fleet-fixture-content';

export const fleetId = (n: number) => `08900000-0000-7000-8000-${String(n).padStart(12, '0')}`;
export const FLEET_TODAY = '2026-11-03';
export const FLEET_COUNTS = [0, 1, 2, 3, 5, 8, 12, 20, 35, 50] as const;
export type FleetPlayer = {
  id: string; linkId: string; captainId: string; index: number;
  kind: 'days' | 'sessions'; state: 'active' | 'pending' | 'frozen' | 'expired';
  joinedBy: 'invite' | 'request';
};
export type FleetCaptain = {
  id: string; index: number; tier: string; limit: number; requestedCount: number;
  status: 'approved' | 'pending' | 'rejected'; suspended: boolean;
  players: FleetPlayer[]; programs: string[]; plans: string[];
};

export async function fleetUser(db: PGlite, n: number, role: 'captain' | 'player' | null) {
  const id = fleetId(n);
  await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    values($1,$2,$3,$4)`, [id, `fleet-${n}@example.test`, TEST_NOW,
    JSON.stringify(role ? { role, full_name: `Fleet ${n}` } : { full_name: `Fleet ${n}` })]);
  return id;
}

export async function createFleet(db: PGlite) {
  // The separate administrator is a player so the fleet contains exactly 30 captains.
  const admin = await fleetUser(db, 1, 'player');
  await db.query('insert into admins(user_id) values($1)', [admin]);
  const tiers = (await db.query<{ tier: string; player_limit: number }>(
    'select tier,player_limit from plan_tiers order by position')).rows;
  const captains: FleetCaptain[] = [];
  for (let index = 0; index < 30; index++) {
    const tier = tiers[index % tiers.length];
    if (!tier) throw new Error('Fleet requires plan tiers');
    // Only provisioning is suppressed to get empty library shapes; all authorization triggers stay enabled.
    await db.exec('alter table profiles disable trigger profiles_starter_templates');
    let id: string;
    try { id = await fleetUser(db, 100 + index, 'captain'); }
    finally { await db.exec('alter table profiles enable trigger profiles_starter_templates'); }
    await asUser(db, admin, tx => tx.query("select admin_review_captain($1,'approved')", [id]));
    await asUser(db, id, tx => tx.query('update profiles set public_slug=$1 where id=$2', [`fleet-${index}`, id]));
    if (tier.tier !== 'entry') await asUser(db, admin, tx => tx.query(
      'select admin_activate_plan($1,$2,1,$3)', [id, tier.tier, `fleet-${index}`]));
    const captain: FleetCaptain = { id, index, tier: tier.tier, limit: tier.player_limit,
      requestedCount: FLEET_COUNTS[index % FLEET_COUNTS.length] ?? 0,
      status: index >= 25 && index <= 27 ? 'pending' : index === 28 ? 'rejected' : 'approved',
      suspended: index === 29, players: [], programs: [], plans: [] };
    for (let j = 0; j < Math.min(captain.requestedCount, captain.limit); j++) {
      const player = await fleetUser(db, 1000 + index * 100 + j, 'player');
      const joinedBy = j % 2 === 0 ? 'invite' : 'request';
      let linkId: string;
      if (joinedBy === 'invite') {
        const code = `fleet-${index}-${j}`;
        await asUser(db, id, tx => tx.query(`insert into coach_invites(id,captain_id,code,access_until)
          values($1,$2,$3,'2026-12-03')`, [fleetId(10000 + index * 100 + j), id, code]));
        const result = await asUser(db, player, tx => tx.query<{ id: string }>('select redeem_invite($1) as id', [code]));
        linkId = result.rows[0]?.id ?? '';
      } else {
        linkId = fleetId(20000 + index * 100 + j);
        await asUser(db, player, tx => tx.query(
          'insert into coach_join_requests(id,captain_id,player_id) values($1,$2,$3)', [linkId, id, player]));
      }
      const kind = (j + index) % 2 === 0 ? 'days' : 'sessions';
      const state = (['active', 'pending', 'frozen', 'expired'] as const)[j % 4] ?? 'active';
      if (state !== 'pending') {
        await asUser(db, id, tx => tx.query('select activate_player($1,null,$2,$3,300,100,false)',
          [linkId, kind, kind === 'days' ? 30 : 4]));
        if (state === 'frozen') await asUser(db, id, tx => tx.query('select set_player_frozen($1,true)', [linkId]));
        if (state === 'expired') await db.query("update coach_clients set access_until='2026-10-29' where id=$1", [linkId]);
      }
      await db.query("update coach_clients set started_on='2026-10-01' where id=$1", [linkId]);
      captain.players.push({ id: player, linkId, captainId: id, index: j, kind, state, joinedBy });
    }
    await seedFleetContent(db, captain);
    captains.push(captain);
  }
  const oldCaptain = captains[3], newCaptain = captains[2];
  const movingPlayer = oldCaptain?.players.pop();
  if (!oldCaptain || !newCaptain || !movingPlayer) throw new Error('Missing move scenario');
  await asUser(db, oldCaptain.id, tx => tx.query('update coach_clients set archived_at=now() where id=$1', [movingPlayer.linkId]));
  const movedLink = fleetId(30000);
  await asUser(db, movingPlayer.id, tx => tx.query(
    'insert into coach_join_requests(id,captain_id,player_id) values($1,$2,$3)', [movedLink, newCaptain.id, movingPlayer.id]));
  await asUser(db, newCaptain.id, tx => tx.query("select activate_player($1,null,'days',30,0,0,true)", [movedLink]));
  newCaptain.players.push({ ...movingPlayer, captainId: newCaptain.id, linkId: movedLink, state: 'active', kind: 'days', joinedBy: 'request' });
  // A paid plan expiring leaves existing players above Entry's cap without bypassing admission limits.
  const overLimitCaptain = captains[17];
  if (!overLimitCaptain) throw new Error('Missing downgrade scenario');
  await db.query("update captain_subscriptions set starts_at='2026-09-01',ends_at='2026-10-01' where captain_id=$1", [overLimitCaptain.id]);
  overLimitCaptain.tier = 'entry';
  overLimitCaptain.limit = 5;
  for (const captain of captains) {
    await db.query('update profiles set captain_status=$2,suspended_at=case when $3 then now() end where id=$1',
      [captain.id, captain.status, captain.suspended]);
  }
  return { admin, captains, players: captains.flatMap(c => c.players), movingPlayer,
    oldCaptain: oldCaptain.id, newCaptain: newCaptain.id, overLimitCaptain: overLimitCaptain.id };
}

export type Fleet = Awaited<ReturnType<typeof createFleet>>;
