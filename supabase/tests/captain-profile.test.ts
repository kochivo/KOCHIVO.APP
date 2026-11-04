import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); await db.exec('grant update, delete on storage.objects to authenticated'); });
afterAll(async () => { await db?.close(); });
it('lets players upload only in their own avatar folder and captains read their photo and phone', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const path = `${player}/photo.webp`;
  await asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name) values ('captain-avatars',$1)`, [path]));
  await expect(asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name) values ('captain-avatars',$1)`, [`${captain}/foreign.webp`]))).rejects.toThrow();
  await asUser(db, player, tx => tx.query(`update profiles set avatar_path=$2, phone=null where id=$1`, [player, path]));
  await asUser(db, player, tx => tx.query(`update profiles set phone='+201012345678' where id=$1`, [player]));
  expect((await asUser(db, captain, tx => tx.query('select avatar_path,phone from profiles where id=$1', [player]))).rows)
    .toEqual([{ avatar_path: path, phone: '+201012345678' }]);
  const other = await createUser(db, 'captain');
  expect((await asUser(db, other, tx => tx.query('select avatar_path,phone from profiles where id=$1', [player]))).rows).toEqual([]);
});

it('allows own branding, prevents cross-captain edits and locks role and plan', async () => {
  const a = await createUser(db, 'captain');
  const b = await createUser(db, 'captain');
  await asUser(db, a, tx => tx.query(`update profiles set bio='Coach', location='Cairo', units='imperial',
    avatar_path=$2, social='{"instagram":"https://instagram.com/ali"}' where id=$1`, [a, `${a}/photo.webp`]));
  expect((await asUser(db, b, tx => tx.query(`update profiles set bio='Other' where id=$1 returning id`, [a]))).rows).toEqual([]);
  expect((await db.query('select bio, units from profiles where id=$1', [a])).rows).toEqual([{ bio: 'Coach', units: 'imperial' }]);
  for (const field of ["role='player'", "plan='pro'"]) {
    await expect(asUser(db, a, tx => tx.query(`update profiles set ${field} where id=$1`, [a]))).rejects.toThrow();
  }
});
it('exposes only contact and public captain fields to their player', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`update profiles set full_name='Ali', phone='+201012345678', bio='Coach' where id=$1`, [captain]);
  const result = await asUser(db, player, tx => tx.query('select * from public.my_captain_profile()'));
  // Players could already see the captain phone before 0046; it stays as the WhatsApp fallback.
  expect(result.rows).toEqual([{ full_name: 'Ali', phone: '+201012345678', bio: 'Coach', location: null, avatar_path: null, social: {} }]);
  expect((await asUser(db, player, tx => tx.query('select phone from profiles where id=$1', [captain]))).rows).toEqual([]);
  const other = await createUser(db, 'player');
  expect((await asUser(db, other, tx => tx.query('select * from public.my_captain_profile()'))).rows).toEqual([]);
});
it('rejects invalid social JSON and lengths', async () => {
  const a = await createUser(db, 'captain');
  for (const social of [{ evil: '' }, { x: 'x'.repeat(201) }, { x: 1 }, [], null]) {
    await expect(asUser(db, a, tx => tx.query('update profiles set social=$2 where id=$1', [a, JSON.stringify(social)]))).rejects.toThrow();
  }
  await expect(asUser(db, a, tx => tx.query(`update profiles set bio=$2 where id=$1`, [a, 'a'.repeat(281)]))).rejects.toThrow();
  await expect(asUser(db, a, tx => tx.query(`update profiles set location=$2 where id=$1`, [a, 'a'.repeat(81)]))).rejects.toThrow();
  await expect(asUser(db, a, tx => tx.query(`update profiles set units='invalid' where id=$1`, [a]))).rejects.toThrow();
});
it('requires avatar ownership and sets bucket restrictions', async () => {
  const a = await createUser(db, 'captain');
  await asUser(db, a, tx => tx.query(`insert into storage.objects(bucket_id,name) values ('captain-avatars',$1)`, [`${a}/photo.webp`]));
  await expect(asUser(db, a, tx => tx.query(`insert into storage.objects(bucket_id,name) values ('captain-avatars','other/photo.webp')`))).rejects.toThrow();
  const b = await createUser(db, 'captain');
  expect((await asUser(db, b, tx => tx.query(`delete from storage.objects where name=$1 returning name`, [`${a}/photo.webp`]))).rows).toEqual([]);
  expect((await asUser(db, b, tx => tx.query(`update storage.objects set name=$1 where name=$2 returning name`, [`${b}/photo.webp`, `${a}/photo.webp`]))).rows).toEqual([]);
  expect((await db.query(`select public, file_size_limit, allowed_mime_types from storage.buckets where id='captain-avatars'`)).rows)
    .toEqual([{ public: true, file_size_limit: 524288, allowed_mime_types: ['image/jpeg', 'image/webp'] }]);
});
it('denies anonymous and suspended callers access to the public-profile RPC', async () => {
  expect((await db.query(`select has_function_privilege('anon','public.my_captain_profile()','execute') as allowed`)).rows)
    .toEqual([{ allowed: false }]);
  const { player } = await createCaptainWithPlayer(db);
  await db.query('update profiles set suspended_at=now() where id=$1', [player]);
  await expect(asUser(db, player, tx => tx.query('select * from public.my_captain_profile()'))).rejects.toThrow();
});
