import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let admin: string;
let captain: string;
beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, 'captain', 'Owner');
  captain = await createUser(db, 'captain', 'Coach');
  await createUser(db, 'player');
  await makeAdmin(db, admin);
  await db.query("update profiles set public_slug = 'owner-coach' where id = $1", [admin]);
  await db.query("update profiles set public_slug = 'real-coach' where id = $1", [captain]);
  for (const id of [admin, captain]) {
    await asUser(db, admin, tx => tx.query("select admin_activate_plan($1, 'legend', 1, 'cash')", [id]));
  }
});
afterAll(async () => { await db?.close(); });

it('excludes admin captains from lists, search, pagination and both captain counts', async () => {
  const listed = await asUser(db, admin, tx => tx.query('select id from admin_captains()'));
  expect(listed.rows).toEqual([{ id: captain }]);
  expect((await asUser(db, admin, tx => tx.query("select id from admin_captains('Owner')"))).rows).toEqual([]);
  expect((await asUser(db, admin, tx => tx.query('select id from admin_captains(null, 1, 0)'))).rows).toEqual([{ id: captain }]);
  const counts = await asUser(db, admin, tx => tx.query('select * from admin_notification_kpis()'));
  expect(counts.rows).toEqual([{ captains: 1, players: 1, paid_captains: 1 }]);
});

it('hides admin public slugs from anonymous and authenticated callers', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.transaction(async tx => {
      await tx.exec(`set local role ${role}`);
      expect((await tx.query("select * from coach_public_profile('owner-coach')")).rows).toEqual([]);
      expect((await tx.query("select id from coach_public_profile('real-coach')")).rows).toEqual([{ id: captain }]);
    });
  }
});
