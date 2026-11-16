import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let existing: string;
let before: unknown;
beforeAll(async () => {
  db = await createTestDb(async (file, instance) => {
    if (file !== '0094_timezone_auto.sql') return;
    existing = await createUser(instance, 'player');
    await instance.query("update profiles set timezone='Asia/Dubai' where id=$1", [existing]);
    before = (await instance.query('select to_jsonb(p) as row from profiles p where id=$1', [existing])).rows;
  });
});
afterAll(async () => { await db?.close(); });
it('defaults to automatic without rewriting any existing profile fields', async () => {
  expect((await db.query("select to_jsonb(p)-'timezone_auto'-'arabic_style'-'locale'-array['specialties','years_experience','languages','show_public_stats','coach_gender','ramadan_mode','ramadan_training','ramadan_intensity','ramadan_water_ml','prayer_city'] as row from profiles p where id=$1", [existing])).rows).toEqual(before);
  expect((await db.query('select timezone_auto from profiles where id=$1', [existing])).rows).toEqual([{ timezone_auto: true }]);
  const fresh = await createUser(db, 'player');
  expect((await db.query('select timezone_auto from profiles where id=$1', [fresh])).rows).toEqual([{ timezone_auto: true }]);
});
it('allows the owner to pin their timezone and denies cross-user changes', async () => {
  const other = await createUser(db, 'player');
  await asUser(db, existing, tx => tx.query('update profiles set timezone_auto=false where id=$1', [existing]));
  await asUser(db, existing, tx => tx.query("update profiles set timezone='Pacific/Auckland' where id=$1 and timezone_auto=true", [existing]));
  expect((await db.query('select timezone from profiles where id=$1', [existing])).rows).toEqual([{ timezone: 'Asia/Dubai' }]);
  expect((await asUser(db, other, tx => tx.query('update profiles set timezone_auto=true where id=$1 returning id', [existing]))).rows).toEqual([]);
  expect((await db.query('select timezone_auto from profiles where id=$1', [existing])).rows).toEqual([{ timezone_auto: false }]);
});

it('exposes only the linked captain timezone for player package labels', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query("update profiles set timezone='America/New_York' where id=$1", [captain]);
  expect((await asUser(db, player, tx => tx.query('select public.my_captain_timezone() as timezone'))).rows)
    .toEqual([{ timezone: 'America/New_York' }]);
  const unrelated = await createUser(db, 'player');
  expect((await asUser(db, unrelated, tx => tx.query('select public.my_captain_timezone() as timezone'))).rows)
    .toEqual([{ timezone: null }]);
  expect((await db.query("select has_function_privilege('anon','public.my_captain_timezone()','execute') as allowed")).rows)
    .toEqual([{ allowed: false }]);
});

it('keeps the anonymous player demo able to read its own seeded captain clock', async () => {
  const result = await db.query<{ id: string }>('insert into auth.users(id,is_anonymous) values(gen_random_uuid(),true) returning id');
  const demo = result.rows[0]?.id;
  if (!demo) throw new Error('Missing demo user');
  await asUser(db, demo, tx => tx.query('select public.create_demo_player_workspace()'), true);
  await asUser(db, demo, tx => tx.query('select public.create_demo_player_workspace()'), true);
  expect((await db.query('select id from programs where player_id=$1', [demo])).rows).toEqual([]);
  expect((await asUser(db, demo, tx => tx.query('select public.my_captain_timezone() as timezone'), true)).rows)
    .toEqual([{ timezone: 'Africa/Cairo' }]);
});
