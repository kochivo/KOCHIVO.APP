import type { PGlite } from '@electric-sql/pglite';
import { stableId } from '../../src/core/offline/ids';
import { asUser, TEST_NOW } from './harness';

export const FLEET_COUNTS = [0, 1, 2, 3, 5, 8, 12, 20, 35, 50] as const;
export const fleetId = (...parts: string[]) => stableId('T-089', ...parts);
export interface FleetPlayer {
  id: string;
  captain: string;
  link: string;
  state: 'active' | 'pending' | 'frozen' | 'expired';
  kind: 'days' | 'sessions';
  joinedBy: 'invite' | 'request';
}
export interface FleetCaptain {
  id: string;
  index: number;
  tier: string;
  limit: number;
  requested: number;
  status: 'approved' | 'pending' | 'rejected';
  suspended: boolean;
  players: FleetPlayer[];
  programs: string[];
  plans: string[];
}

export async function fleetUser(db: PGlite, key: string, role: 'captain' | 'player') {
  const id = await fleetId('user', key);
  await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    values ($1,$2,$3,$4)`, [id, `${key}@fleet.invalid`, TEST_NOW,
    JSON.stringify({ role, full_name: key })]);
  if (role === 'captain') await db.query("update profiles set captain_status='approved' where id=$1", [id]);
  return id;
}

/** Seed historical state as owner; actual joins still exercise the public app entry points. */
export async function createFleet(db: PGlite) {
  const tiers = (await db.query<{ tier: string; player_limit: number }>(
    'select tier,player_limit from plan_tiers order by position')).rows;
  const captains: FleetCaptain[] = [];
  for (let index = 0; index < 30; index++) {
    const tier = tiers[index === 9 ? tiers.length - 1 : index % tiers.length];
    if (!tier) throw new Error('Fleet requires plan tiers');
    const id = await fleetUser(db, `captain-${index}`, 'captain');
    await db.query('update profiles set public_slug=$2 where id=$1', [id, `fleet-${index}`]);
    if (tier.tier !== 'entry') await db.query(`insert into captain_subscriptions
      (id,captain_id,tier,starts_at,ends_at,amount_egp,activated_by)
      values ($1,$2,$3,'2026-11-01','2026-12-01',0,$2)`, [await fleetId('subscription', id), id, tier.tier]);
    const requested = FLEET_COUNTS[index % FLEET_COUNTS.length] ?? 0;
    const captain: FleetCaptain = { id, index, tier: tier.tier, limit: tier.player_limit, requested,
      status: index >= 25 && index <= 27 ? 'pending' : index === 28 ? 'rejected' : 'approved',
      suspended: index === 29, players: [], programs: [], plans: [] };
    for (let n = 0; n < Math.min(requested, tier.player_limit); n++) {
      const player = await fleetUser(db, `player-${index}-${n}`, 'player');
      const joinedBy = n % 2 ? 'request' : 'invite';
      let link = await fleetId('request', player);
      if (joinedBy === 'invite') {
        const code = `fleet-${index}-${n}`;
        const inviteId = await fleetId('invite', player);
        await asUser(db, id, tx => tx.query(`insert into coach_invites(id,captain_id,code,access_until)
          values ($1,$2,$3,'2026-12-03')`, [inviteId, id, code]));
        const result = await asUser(db, player, tx => tx.query<{ id: string }>(
          'select redeem_invite($1) as id', [code]));
        link = result.rows[0]?.id ?? '';
      } else {
        await asUser(db, player, tx => tx.query(`insert into coach_join_requests(id,captain_id,player_id)
          values ($1,$2,$3)`, [link, id, player]));
      }
      const state = (['active', 'pending', 'frozen', 'expired'] as const)[n % 4] ?? 'active';
      const kind = n % 3 ? 'sessions' : 'days';
      await db.query(`update coach_clients set pending=$2,frozen_at=$3,access_until=$4,
        sessions_left=$5,billing_started_at='2026-11-01T00:00:00Z' where id=$1`,
      [link, state === 'pending', state === 'frozen' ? TEST_NOW : null,
        state === 'expired' ? '2026-10-25' : '2026-12-03', kind === 'sessions' ? 3 : null]);
      if (state !== 'pending') await db.query("update coach_join_requests set status='accepted' where id=$1", [link]);
      captain.players.push({ id: player, captain: id, link, state, kind, joinedBy });
    }
    for (let n = 0; n < index % 4; n++) {
      const program = await fleetId('template-program', id, String(n));
      await db.query(`insert into programs(id,captain_id,title,is_template) values ($1,$2,'Fleet training',true)`, [program, id]);
      await db.query('insert into program_days(id,program_id,position) values ($1,$2,1)', [await fleetId('template-day', program), program]);
      captain.programs.push(program);
    }
    for (let n = 0; n < index % 3; n++) {
      const plan = await fleetId('template-plan', id, String(n));
      await db.query(`insert into nutrition_plans(id,captain_id,title,is_template) values ($1,$2,'Fleet meals',true)`, [plan, id]);
      await db.query("insert into meals(id,plan_id,position,name) values ($1,$2,1,'Lunch')", [await fleetId('template-meal', plan), plan]);
      captain.plans.push(plan);
    }
    const assigned = captain.players[0];
    if (assigned) {
      await db.query(`insert into programs(id,captain_id,player_id,title,status)
        values ($1,$2,$3,'Assigned fleet training','active')`, [await fleetId('assigned-program', id), id, assigned.id]);
      await db.query(`insert into nutrition_plans(id,captain_id,player_id,title,status)
        values ($1,$2,$3,'Assigned fleet meals','active')`, [await fleetId('assigned-plan', id), id, assigned.id]);
    }
    captains.push(captain);
  }
  // Approval and suspension happen after historical relationships have been seeded.
  for (const c of captains) await db.query('update profiles set captain_status=$2,suspended_at=$3 where id=$1',
    [c.id, c.status, c.suspended ? TEST_NOW : null]);
  return { captains, players: captains.flatMap(c => c.players), overLimitCaptain: captains.find(c => c.requested > c.limit) };
}
