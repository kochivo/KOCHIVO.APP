import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, TEST_NOW } from './harness';
import { fleetId } from './fleet-fixture';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));

it.each(['pending', 'frozen', 'expired', 'archived'] as const)(
  '%s players retain scan reads and deletes but cannot insert, update or upload', async state => {
    const { captain, player } = await createCaptainWithPlayer(db);
    const scan = fleetId(90000 + ['pending', 'frozen', 'expired', 'archived'].indexOf(state));
    const path = `${player}/${scan}.jpg`;
    await db.exec('grant delete on storage.objects to authenticated');
    await run(player, "insert into body_scans(id,scan_date,weight_kg) values($1,'2026-11-03',80)", [scan]);
    const upload = (name: string) => run(player, "insert into storage.objects(bucket_id,name) values('body-scans',$1)", [name]);
    await upload(path);
    await db.query(`update coach_clients set pending=$2,frozen_at=$3,access_until=$4,archived_at=$5
      where captain_id=$1`, [captain, state === 'pending', state === 'frozen' ? TEST_NOW : null,
      state === 'expired' ? '2026-11-02' : '2026-12-03', state === 'archived' ? TEST_NOW : null]);
    expect((await run(player, 'select id from body_scans')).rows).toEqual([{ id: scan }]);
    expect((await run(player, 'update body_scans set weight_kg=81 returning id')).rows).toEqual([]);
    await expect(run(player, "insert into body_scans(id,scan_date,weight_kg) values($1,'2026-11-02',80)", [scan]))
      .rejects.toMatchObject({ code: '42501' });
    await expect(upload(`${player}/${scan}.pdf`)).rejects.toMatchObject({ code: '42501' });
    expect((await run(player, "select name from storage.objects where bucket_id='body-scans'")).rows).toEqual([{ name: path }]);
    expect((await run(player, 'delete from body_scans returning id')).rows).toEqual([{ id: scan }]);
    expect((await run(player, "delete from storage.objects where bucket_id='body-scans' returning name")).rows).toEqual([{ name: path }]);
  },
);

it('uses the Cairo expiry date for alerts even when the captain uses another timezone', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query("update profiles set timezone='America/Los_Angeles' where id=$1", [captain]);
  await db.query("update coach_clients set started_on='2026-10-01',access_until='2026-11-03' where player_id=$1", [player]);
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-03T23:30:00Z' $$`);
  try {
    await run(captain, 'select refresh_inactive_alerts()');
    expect((await run(captain, "select id from notifications where type='player_inactive'")).rows).toEqual([]);
  } finally {
    await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
      as $$ select timestamptz '${TEST_NOW}' $$`);
  }
});

it('advances the billing boundary on every days renewal and preserves RPC grants', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query("update coach_clients set billing_started_at='2026-11-01' where player_id=$1", [player]);
  for (const timestamp of [TEST_NOW, '2026-11-04T10:00:00Z']) {
    await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
      as $$ select timestamptz '${timestamp}' $$`);
    try {
      await run(captain, 'select renew_player($1,30)', [player]);
      const result = await db.query<{ billing_started_at: Date }>('select billing_started_at from coach_clients where player_id=$1', [player]);
      expect(result.rows[0]?.billing_started_at.toISOString()).toBe(new Date(timestamp).toISOString());
    } finally {
      await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
        as $$ select timestamptz '${TEST_NOW}' $$`);
    }
  }
  for (const fn of ['redeem_invite(text)', 'refresh_inactive_alerts()', 'renew_player(uuid,integer,integer,integer,uuid)']) {
    expect((await db.query(`select has_function_privilege('authenticated',$1,'execute') as authenticated,
      has_function_privilege('anon',$1,'execute') as anon`, [`public.${fn}`])).rows)
      .toEqual([{ authenticated: true, anon: false }]);
  }
});
