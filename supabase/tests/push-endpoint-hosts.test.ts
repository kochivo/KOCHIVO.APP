import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
let player: string;
beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (!file.startsWith('0063_')) return;
    const user = await createUser(database, 'player');
    await database.query(`insert into public.push_subscriptions(id,user_id,endpoint,p256dh,auth)
      values(gen_random_uuid(),$1,'https://evil.test/legacy','key','auth')`, [user]);
  });
  player = await createUser(db, 'player');
});
afterAll(async () => { await db?.close(); });

it('deletes legacy endpoints outside the allow-list', async () => {
  expect((await db.query("select id from public.push_subscriptions where endpoint='https://evil.test/legacy'")).rows).toEqual([]);
});

it.each([
  ['https://fcm.googleapis.com/a', true], ['https://web.push.apple.com/a', true],
  ['https://updates.push.services.mozilla.com/a', true], ['https://push.services.mozilla.com/a', true],
  ['https://wns.notify.windows.com/a', true], ['https://evil.test/a', false],
  ['https://fcm.googleapis.com.evil.test/a', false], ['https://evil.test@fcm.googleapis.com/a', false],
  ['https://fcm.googleapis.com:8443/a', false], ['http://fcm.googleapis.com/a', false],
])('enforces endpoint hosts for %s', async (endpoint, allowed) => {
  const insert = asUser(db, player, tx => tx.query(`insert into public.push_subscriptions(id,endpoint,p256dh,auth)
    values(gen_random_uuid(),$1,'key','auth')`, [endpoint]));
  if (allowed) await expect(insert).resolves.toBeDefined();
  else await expect(insert).rejects.toMatchObject({ code: '23514' });
});
