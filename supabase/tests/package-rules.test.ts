import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
let backfilledPlayer: string;
beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (file !== '0064_package_rules.sql') return;
    const { player } = await createCaptainWithPlayer(database);
    backfilledPlayer = player;
    await database.query("update coach_clients set created_at='2026-10-01T09:00Z' where player_id=$1", [player]);
  });
});
afterAll(async () => { await db?.close(); });

it('backfills billing starts and defaults new links to their creation time', async () => {
  expect((await db.query('select billing_started_at=created_at as matches from coach_clients where player_id=$1',
    [backfilledPlayer])).rows).toEqual([{ matches: true }]);
  const { player } = await createCaptainWithPlayer(db);
  expect((await db.query('select billing_started_at=created_at as matches from coach_clients where player_id=$1',
    [player])).rows).toEqual([{ matches: true }]);
});

it('allows only confirmed captains to create templates, including anonymous auth accounts', async () => {
  const captain = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  const anonymous = await createUser(db, 'player');
  await db.query('update auth.users set is_anonymous=true where id=$1', [anonymous]);
  for (const table of ['programs', 'nutrition_plans']) {
    const insert = (user: string) => asUser(db, user, tx => tx.query(
      `insert into ${table}(captain_id,title,is_template) values ($1,'Template',true)`, [user]), user === anonymous);
    await expect(insert(player)).rejects.toMatchObject({ code: '42501' });
    await expect(insert(anonymous)).rejects.toMatchObject({ code: '42501' });
    await insert(captain);
    await db.query('update profiles set role_confirmed=false where id=$1', [captain]);
    await expect(insert(captain)).rejects.toMatchObject({ code: '42501' });
    await db.query('update profiles set role_confirmed=true where id=$1', [captain]);
  }
});

it('hides unapproved public captains and rejects join requests', async () => {
  const captain = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  for (const status of ['pending', 'rejected']) {
    await db.query("update profiles set public_slug='package-coach',captain_status=$2 where id=$1", [captain, status]);
    expect((await db.query("select * from coach_public_profile('package-coach')")).rows).toEqual([]);
    await expect(asUser(db, player, tx => tx.query(
      'insert into coach_join_requests(id,captain_id,player_id) values(gen_random_uuid(),$1,$2)', [captain, player])))
      .rejects.toMatchObject({ code: '42501' });
  }
});

it('uses Cairo midnight for write expiry and read grace', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query("update coach_clients set access_until='2026-11-03' where player_id=$1", [player]);
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-03T23:30:00Z' $$`);
  try {
    expect((await asUser(db, player, tx => tx.query('select player_can_write() as w'))).rows).toEqual([{ w: false }]);
    await db.query("update coach_clients set access_until='2026-10-31' where player_id=$1", [player]);
    expect((await asUser(db, player, tx => tx.query(
      'select player_can_read() as r,player_can_read_from($1) as f', [captain]))).rows).toEqual([{ r: false, f: false }]);
  } finally {
    await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
      as $$ select timestamptz '${TEST_NOW}' $$`);
  }
});

it('clears sessions for days renewal and rejects frozen renewal without payment', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query('update coach_clients set sessions_left=5 where player_id=$1', [player]);
  await asUser(db, captain, tx => tx.query('select renew_player($1,7)', [player]));
  expect((await db.query('select sessions_left from coach_clients where player_id=$1', [player])).rows)
    .toEqual([{ sessions_left: null }]);
  await db.query('update coach_clients set frozen_at=now() where player_id=$1', [player]);
  await expect(asUser(db, captain, tx => tx.query('select renew_player($1,7)', [player])))
    .rejects.toMatchObject({ code: '22023', message: 'unfreeze first' });
  expect((await db.query('select id from player_payments where player_id=$1', [player])).rows).toHaveLength(1);
});

it('attributes deductions to the billing period and falls back to completion for a null start', async () => {
  // Exercise the trigger's compatibility fallback even though current inserts require a start.
  await db.exec('alter table workout_sessions alter column started_at drop not null');
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query("update coach_clients set pending=true,created_at='2026-10-01' where player_id=$1", [player]);
  const link = (await db.query<{ id: string }>('select id from coach_clients where player_id=$1', [player])).rows[0]?.id;
  await asUser(db, captain, tx => tx.query("select activate_player($1,null,'sessions',5,0,0,true)", [link]));
  expect((await db.query('select billing_started_at=now() as activated from coach_clients where id=$1', [link])).rows)
    .toEqual([{ activated: true }]);
  for (const [start, date, end] of [
    ['2026-11-03T09:00Z', '2026-11-03', '2026-11-03T11:00Z'],
    ['2026-11-03T11:00Z', '2026-09-30', '2026-11-03T12:00Z'],
    ['2026-11-03T11:00Z', '2027-01-03', '2026-11-03T12:00Z'],
    ['2026-11-03T11:00Z', '2026-11-03', '2026-11-03T12:00Z'],
    [null, '2026-11-03', '2026-11-03T12:00Z'],
  ]) {
    await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
      values(gen_random_uuid(),$1,$2,$3,$4,$4)`, [player, date, start, end]);
  }
  expect((await db.query('select sessions_left from coach_clients where id=$1', [link])).rows).toEqual([{ sessions_left: 3 }]);
});

it('queues reminders only for the matching active, unfrozen, nonpending relationship', async () => {
  for (const state of ['active', 'frozen', 'pending', 'expired', 'archived']) {
    const { captain, player } = await createCaptainWithPlayer(db);
    await db.query(`update coach_clients set frozen_at=case when $2='frozen' then now() end,
      pending=($2='pending'),access_until=case when $2='expired' then date '2026-11-02' else date '2026-11-03' end,
      archived_at=case when $2='archived' then now() end where player_id=$1`, [player, state]);
    const program = (await db.query<{ id: string }>(`insert into programs(captain_id,player_id,title,status)
      values($1,$2,'Training','active') returning id`, [captain, player])).rows[0]?.id;
    await db.query("insert into program_days(program_id,position,title,weekday) values($1,0,'Training',3)", [program]);
    await db.query("select queue_workout_reminders('2026-11-03')");
    expect((await db.query("select id from notifications where user_id=$1 and type='workout_reminder'", [player])).rows)
      .toHaveLength(state === 'active' ? 1 : 0);
  }
});
