import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser, dayOffset } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
async function coach(slug: string) {
  const id = await createUser(db, 'captain', 'Ahmed');
  await db.query('update profiles set public_slug=$2 where id=$1', [id, slug]);
  return id;
}
async function request(captain: string, player: string) {
  const result = await asUser(db, player, tx => tx.query<{ id: string }>(
    `insert into coach_join_requests(id,captain_id,player_id) values (gen_random_uuid(),$1,$2) returning id`, [captain, player]));
  return result.rows[0]?.id;
}
it('exposes only public fields to anon, hides unknown and suspended coaches, and denies table access', async () => {
  const id = await coach('ahmed');
  await db.transaction(async tx => {
    await tx.exec('set local role anon');
    const result = await tx.query('select * from coach_public_profile($1)', ['ahmed']);
    expect(result.rows).toEqual([{ id, full_name: 'Ahmed', bio: null, location: null, avatar_path: null, social: {} }]);
    expect((await tx.query('select * from coach_public_profile($1)', ['missing'])).rows).toEqual([]);
  });
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select * from profiles'); })).rejects.toThrow();
  await db.query('update profiles set suspended_at=now() where id=$1', [id]);
  expect((await db.query('select * from coach_public_profile($1)', ['ahmed'])).rows).toEqual([]);
});
it('enforces captain-only, unique, lowercase and reserved slugs', async () => {
  const id = await coach('valid-name');
  for (const slug of ['ab', 'a'.repeat(31), 'Admin', 'admin', 'api', 'login', 'bad_name']) {
    await expect(asUser(db, id, tx => tx.query('update profiles set public_slug=$2 where id=$1', [id, slug]))).rejects.toThrow();
  }
  const other = await createUser(db, 'captain');
  await expect(asUser(db, other, tx => tx.query("update profiles set public_slug='valid-name' where id=$1", [other]))).rejects.toThrow();
  const player = await createUser(db, 'player');
  await expect(asUser(db, player, tx => tx.query("update profiles set public_slug='player' where id=$1", [player]))).rejects.toThrow();
});
it('keeps requests isolated and pending until the owning captain accepts through seat enforcement', async () => {
  const captain = await coach('requests');
  const player = await createUser(db, 'player');
  const other = await createUser(db, 'captain');
  const id = await request(captain, player);
  expect((await db.query("select type from notifications where id=$1", [id])).rows).toEqual([{ type: 'join_requested' }]);
  expect((await db.query('select id from coach_clients where player_id=$1', [player])).rows).toEqual([]);
  await expect(request(captain, player)).rejects.toThrow();
  expect((await asUser(db, other, tx => tx.query('select * from coach_join_requests where id=$1', [id]))).rows).toEqual([]);
  await expect(asUser(db, other, tx => tx.query("select resolve_coach_join_request($1,'accepted',gen_random_uuid())", [id]))).rejects.toThrow();
  await expect(asUser(db, player, tx => tx.query("update coach_join_requests set status='accepted' where id=$1", [id]))).rejects.toThrow();
  await asUser(db, captain, tx => tx.query("select resolve_coach_join_request($1,'accepted',gen_random_uuid())", [id]));
  expect((await db.query('select captain_id, player_id from coach_clients where player_id=$1', [player])).rows).toEqual([{ captain_id: captain, player_id: player }]);
  expect((await db.query('select status from coach_join_requests where id=$1', [id])).rows).toEqual([{ status: 'accepted' }]);
});
it('rolls back acceptance when the plan is full and allows declining without a seat', async () => {
  const captain = await coach('full-coach');
  for (let n = 0; n < 5; n++) {
    const player = await createUser(db, 'player');
    await db.query('insert into coach_clients(captain_id,player_id,access_until) values ($1,$2,$3)', [captain, player, await dayOffset(db, 30)]);
  }
  const id = await request(captain, await createUser(db, 'player'));
  await expect(asUser(db, captain, tx => tx.query("select resolve_coach_join_request($1,'accepted',gen_random_uuid())", [id]))).rejects.toThrow(/5 active players/);
  expect((await db.query('select status from coach_join_requests where id=$1', [id])).rows).toEqual([{ status: 'pending' }]);
  await asUser(db, captain, tx => tx.query("select resolve_coach_join_request($1,'declined',gen_random_uuid())", [id]));
  expect((await db.query('select status from coach_join_requests where id=$1', [id])).rows).toEqual([{ status: 'declined' }]);
});
it('blocks forged requests, inactive players and direct status changes', async () => {
  const captain = await coach('guarded');
  const player = await createUser(db, 'player');
  const other = await createUser(db, 'player');
  await expect(asUser(db, player, tx => tx.query('insert into coach_join_requests(id,captain_id,player_id) values (gen_random_uuid(),$1,$2)', [captain, other]))).rejects.toThrow();
  const id = await request(captain, player);
  await expect(asUser(db, captain, tx => tx.query("update coach_join_requests set status='accepted' where id=$1", [id]))).rejects.toThrow();
  await db.query('update profiles set suspended_at=now() where id=$1', [player]);
  await expect(asUser(db, captain, tx => tx.query("select resolve_coach_join_request($1,'accepted',gen_random_uuid())", [id]))).rejects.toThrow();
  expect((await asUser(db, player, tx => tx.query('select * from coach_join_requests'))).rows).toEqual([]);
  await db.query('update profiles set suspended_at=now() where id=$1', [captain]);
  await expect(asUser(db, captain, tx => tx.query("select resolve_coach_join_request($1,'declined',gen_random_uuid())", [id]))).rejects.toThrow();
});
