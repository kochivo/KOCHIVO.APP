import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite, captain: string, player: string, other: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  await db.query("update profiles set public_slug='delete-test-coach',role_confirmed=true where id=$1", [captain]);
  other = await createUser(db, 'captain');
});
afterAll(async () => { await db?.close(); });

async function archivedTier(name: string) {
  const { rows } = await db.query<{ id: string; duration: string }>(`
    with tier as (
      insert into captain_package_tiers(captain_id,name,archived_at) values ($1,$2,now()) returning id
    )
    insert into captain_packages(captain_id,tier_id,name,days,price_egp)
      select $1,id,$2,30,1000 from tier returning tier_id as id,id as duration
  `, [captain, name]);
  if (!rows[0]) throw new Error('Missing tier fixture');
  return rows[0];
}
const deleteTier = (user: string, id: string) => asUser(db, user, tx => tx.query(
  'select delete_archived_package_tier($1) as deleted', [id]));
const eligibility = (id: string) => asUser(db, captain, tx => tx.query(
  'select package_tier_deletable(t) as eligible from captain_package_tiers t where t.id=$1', [id]));

it('deletes an unused archived tier and its durations only for the owner', async () => {
  const { id, duration } = await archivedTier('Unused');
  await expect(deleteTier(other, id)).rejects.toMatchObject({ code: '42501' });
  await expect(deleteTier(player, id)).rejects.toMatchObject({ code: '42501' });
  expect((await eligibility(id)).rows).toEqual([{ eligible: true }]);
  expect((await deleteTier(captain, id)).rows).toEqual([{ deleted: true }]);
  expect((await eligibility(id)).rows).toEqual([]);
  expect((await db.query('select id from captain_packages where id=$1', [duration])).rows).toEqual([]);
});

it.each(['tier payment', 'duration payment', 'join request', 'renewal request'])('preserves a tier with %s history', async history => {
  const { id, duration } = await archivedTier(history);
  if (history === 'join request') {
    const joiner = await createUser(db, 'player');
    await db.query(`insert into coach_join_requests(id,player_id,captain_id,package_id)
      values(gen_random_uuid(),$1,$2,$3)`, [joiner, captain, duration]);
  } else if (history === 'renewal request') {
    await db.query(`insert into player_renewal_requests(id,player_id,captain_id,package_id,status)
      values(gen_random_uuid(),$1,$2,$3,'declined')`, [player, captain, duration]);
  } else {
    await db.query(`insert into player_payments(captain_id,player_id,days,period_start,period_end,package_id,tier_id)
      values($1,$2,30,'2026-10-01','2026-10-30',$3,$4)`,
    [captain, player, history === 'duration payment' ? duration : null, history === 'tier payment' ? id : null]);
  }
  expect((await eligibility(id)).rows).toEqual([{ eligible: false }]);
  expect((await deleteTier(captain, id)).rows).toEqual([{ deleted: false }]);
  expect((await db.query('select id from captain_packages where id=$1', [duration])).rows).toEqual([{ id: duration }]);
  if (history === 'duration payment') {
    expect((await asUser(db, captain, tx => tx.query('delete from captain_packages where id=$1 returning id', [duration]))).rows).toEqual([]);
    expect((await db.query('select package_id from player_payments where package_id=$1', [duration])).rows).toEqual([{ package_id: duration }]);
  }
});
