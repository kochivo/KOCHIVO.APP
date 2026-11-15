import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, TEST_NOW } from './harness';
import { createFleet, fleetId } from './fleet-fixture';
import type { Fleet } from './fleet-fixture';

let db: PGlite;
let fleet: Fleet;
beforeAll(async () => { db = await createTestDb(); fleet = await createFleet(db); });
afterAll(async () => { await db?.close(); });
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query<Record<string, unknown>>(sql, params));
const cases = Array.from({ length: 25 }, (_, i) => i).filter(i => i % 10 !== 0)
  .flatMap(index => (['days', 'sessions'] as const).map(kind => ({ index, kind })));

it.each(cases)('captain $index activates, freezes and renews a $kind package with correct dues', async ({ index, kind }) => {
  const captain = fleet.captains[index];
  const player = captain?.players[0];
  if (!captain || !player) throw new Error('Missing billing scenario');
  const balance = () => db.query<{ pending: boolean; sessions_left: number | null; access_until: string; frozen_at: Date | null }>(
    'select pending,sessions_left,access_until::text,frozen_at from coach_clients where id=$1', [player.linkId]);
  const payments = () => db.query('select id from player_payments where player_id=$1', [player.id]);
  const due = async () => Number((await run(captain.id, 'select due_egp from captain_dues() where player_id=$1', [player.id])).rows[0]?.due_egp ?? 0);
  const previousDue = await due();
  // Reuse a roster slot at full entry-tier capacity; only initial package state is seeded.
  await db.query('update coach_clients set pending=true,frozen_at=null,sessions_left=null where id=$1', [player.linkId]);
  await run(captain.id, 'select activate_player($1,null,$2,$3,300,100,false)', [player.linkId, kind, kind === 'days' ? 7 : 1]);
  expect((await balance()).rows[0]).toMatchObject({ pending: false, frozen_at: null,
    sessions_left: kind === 'days' ? null : 1, access_until: kind === 'days' ? '2026-11-10' : '2027-01-02' });
  expect(await due()).toBe(previousDue + 200);
  // This scenario exercises the running subscription's freeze and credit rules.
  await run(captain.id, 'select start_player_subscription($1)', [player.linkId]);
  await run(captain.id, 'select set_player_frozen($1,true)', [player.linkId]);
  const before = (await payments()).rows;
  await expect(run(captain.id, 'select renew_player($1,7)', [player.id]))
    .rejects.toMatchObject({ code: '22023', message: 'unfreeze first' });
  expect((await payments()).rows).toEqual(before);
  await db.query("update coach_clients set frozen_at=now()-interval '2 days 3 hours' where id=$1", [player.linkId]);
  await run(captain.id, 'select set_player_frozen($1,false)', [player.linkId]);
  await run(captain.id, 'select set_player_frozen($1,false)', [player.linkId]);
  expect((await balance()).rows[0]?.access_until).toBe(kind === 'days' ? '2026-11-12' : '2027-01-04');
  if (kind === 'sessions') {
    const session = { id: fleetId(90000 + index), training_date: '2026-11-03', started_at: TEST_NOW,
      completed_at: '2026-11-03T10:01:00Z', client_updated_at: '2026-11-03T10:01:00Z' };
    for (let retry = 0; retry < 2; retry++) await run(player.id, 'select sync_workout_sessions($1)', [JSON.stringify([session])]);
    expect((await balance()).rows[0]?.sessions_left).toBe(0);
    expect((await run(captain.id, `select payload from notifications where type='sessions_used_up'
      and payload->>'session_id'=$1`, [session.id])).rows).toEqual([{ payload: { player_id: player.id, session_id: session.id } }]);
    const pkg = (await run(captain.id, `insert into captain_packages(captain_id,name,days,price_egp,kind,sessions)
      values($1,'PT',30,300,'sessions',3) returning id`, [captain.id])).rows[0]?.id;
    await run(captain.id, 'select renew_player($1,p_package=>$2,p_amount=>300)', [player.id, pkg]);
    await run(captain.id, 'select renew_player($1,p_package=>$2,p_amount=>300)', [player.id, pkg]);
    expect((await balance()).rows[0]?.sessions_left).toBe(6);
    await run(captain.id, 'select renew_player($1,7,0,0)', [player.id]);
    expect((await balance()).rows[0]?.sessions_left).toBeNull();
  } else {
    await run(captain.id, 'select renew_player($1,7,300,300)', [player.id]);
    expect((await balance()).rows[0]).toMatchObject({ sessions_left: null, access_until: '2026-11-19' });
  }
  expect(await due()).toBe(previousDue + 200);
  await run(captain.id, 'select collect_player_payment($1,$2)', [player.id, previousDue + 200]);
  expect(await due()).toBe(0);
});
