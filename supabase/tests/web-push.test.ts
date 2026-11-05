import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let player: string;
let other: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'player');
});
afterAll(async () => { await db.close(); });

const insert = (user: string, endpoint: string, owner = user) => asUser(db, user, tx => tx.query(
  `insert into public.push_subscriptions(id,user_id,endpoint,p256dh,auth)
   values(gen_random_uuid(),$1,$2,'key','auth') returning id`, [owner, endpoint]));

it('isolates owner select/insert/delete and denies updates and anon', async () => {
  await insert(player, 'https://push.example/owner');
  expect((await asUser(db, player, tx => tx.query('select endpoint from public.push_subscriptions'))).rows)
    .toEqual([{ endpoint: 'https://push.example/owner' }]);
  expect((await asUser(db, other, tx => tx.query('select id from public.push_subscriptions'))).rows).toEqual([]);
  expect((await asUser(db, other, tx => tx.query('delete from public.push_subscriptions returning id'))).rows).toEqual([]);
  await expect(insert(other, 'https://push.example/forged', player)).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, player, tx => tx.query("update public.push_subscriptions set auth='changed'")))
    .rejects.toMatchObject({ code: '42501' });
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    await tx.query('select * from public.push_subscriptions');
  })).rejects.toMatchObject({ code: '42501' });
  expect((await asUser(db, player, tx => tx.query('delete from public.push_subscriptions returning id'))).rows).toHaveLength(1);
});

it('caps subscriptions at ten and frees a slot on deletion', async () => {
  for (let i = 0; i < 10; i++) await insert(other, `https://push.example/${i}`);
  await expect(insert(other, 'https://push.example/11')).rejects.toMatchObject({ code: '23514' });
  await asUser(db, other, tx => tx.query("delete from public.push_subscriptions where endpoint='https://push.example/0'"));
  await insert(other, 'https://push.example/replacement');
});

it('validates endpoints, agent length, uniqueness and suspended owners', async () => {
  await expect(insert(player, 'http://push.example/insecure')).rejects.toMatchObject({ code: '23514' });
  await expect(insert(player, `https://${'a'.repeat(1000)}`)).rejects.toMatchObject({ code: '23514' });
  await insert(player, 'https://push.example/unique');
  await expect(insert(player, 'https://push.example/unique')).rejects.toMatchObject({ code: '23505' });
  await expect(asUser(db, player, tx => tx.query(`insert into public.push_subscriptions(id,endpoint,p256dh,auth,user_agent)
    values(gen_random_uuid(),'https://push.example/agent','key','auth',$1)`, ['a'.repeat(301)])))
    .rejects.toMatchObject({ code: '23514' });
  await db.query('update public.profiles set suspended_at=now() where id=$1', [player]);
  expect((await asUser(db, player, tx => tx.query('select id from public.push_subscriptions'))).rows).toEqual([]);
  await expect(insert(player, 'https://push.example/suspended')).rejects.toMatchObject({ code: '42501' });
  await db.query('update public.profiles set suspended_at=null where id=$1', [player]);
});

it('commits notifications with no vault, cron or pg_net', async () => {
  expect((await db.query('select public.push_config() as config')).rows).toEqual([{ config: null }]);
  await db.query("insert into public.notifications(user_id,type) values($1,'workout_reminder')", [other]);
  expect((await db.query("select id from public.notifications where type='workout_reminder'")).rows).toHaveLength(1);
  await db.query("delete from public.notifications where type='workout_reminder'");
});

it('restricts config and queue RPC execution to privileged roles', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const fn of ['public.push_config()', 'public.queue_workout_reminders(date)']) {
      expect((await db.query('select has_function_privilege($1,$2,\'execute\') as allowed', [role, fn])).rows)
        .toEqual([{ allowed: false }]);
    }
  }
  expect((await db.query("select has_function_privilege('service_role','public.push_config()','execute') as allowed")).rows)
    .toEqual([{ allowed: true }]);
});

it('posts only with complete config and pg_net, and contains network/config failures', async () => {
  // Optional service stubs belong only to this test, never the migration.
  await db.exec(`create schema vault;
    create table vault.decrypted_secrets(name text, decrypted_secret text);
    insert into vault.decrypted_secrets values ('push_function_url','https://functions.example/send-push'),
      ('push_hook_secret','test-secret'),('vapid_public_key','public'),('vapid_private_key','private');`);
  const notify = () => db.query<{ id: string }>("insert into public.notifications(user_id,type) values($1,'plan_assigned') returning id", [player]);
  await notify();
  await db.exec(`create schema net;
    create table net.requests(url text, body jsonb, headers jsonb);
    create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}',
      headers jsonb default '{}', timeout_milliseconds integer default 5000) returns bigint language plpgsql as $$
      begin insert into net.requests values(url,body,headers); return 1; end $$;`);
  await notify();
  expect((await db.query('select * from net.requests')).rows).toEqual([]);
  await db.exec("insert into vault.decrypted_secrets values('vapid_subject','mailto:test@example.com')");
  const { rows } = await notify();
  expect((await db.query('select * from net.requests')).rows).toEqual([{
    url: 'https://functions.example/send-push', body: { notification_id: rows[0]?.id },
    headers: { 'Content-Type': 'application/json', 'x-push-secret': 'test-secret' },
  }]);
  await db.exec(`create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}',
    headers jsonb default '{}', timeout_milliseconds integer default 5000) returns bigint language plpgsql as $$
    begin raise exception 'network unavailable'; end $$;`);
  expect((await notify()).rows).toHaveLength(1);
  await db.exec('drop schema vault cascade');
  expect((await notify()).rows).toHaveLength(1);
  await db.exec('drop schema net cascade');
});

it('queues only active training days, skips logged/rest/legacy/suspended, and is idempotent per date', async () => {
  const fixtures = [
    { title: 'Training', weekday: 0, rest: false, status: 'active', suspended: false, logged: false },
    { title: 'Rest', weekday: 0, rest: true, status: 'active', suspended: false, logged: false },
    { title: 'Logged', weekday: 0, rest: false, status: 'active', suspended: false, logged: true },
    { title: 'Legacy', weekday: null, rest: false, status: 'active', suspended: false, logged: false },
    { title: 'Suspended', weekday: 0, rest: false, status: 'active', suspended: true, logged: false },
    { title: 'Draft', weekday: 0, rest: false, status: 'draft', suspended: false, logged: false },
    { title: 'Sunday', weekday: 1, rest: false, status: 'active', suspended: false, logged: false },
    { title: 'Archived', weekday: 0, rest: false, status: 'archived', suspended: false, logged: false },
  ];
  let trainingPlayer = '';
  let trainingProgram = '';
  for (const fixture of fixtures) {
    const { captain: coach, player: user } = await createCaptainWithPlayer(db);
    const { rows } = await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status)
      values($1,$2,$3,$4) returning id`, [coach, user, fixture.title, fixture.status]);
    const program = rows[0]?.id;
    if (!program) throw new Error('Missing fixture program');
    await db.query(`insert into public.program_days(program_id,position,title,weekday,is_rest_day) values($1,0,$2,$3,$4)`,
      [program, fixture.title, fixture.weekday, fixture.rest]);
    if (fixture.suspended) await db.query('update public.profiles set suspended_at=now() where id=$1', [user]);
    if (fixture.logged) await db.query(`insert into public.workout_sessions(id,player_id,training_date,started_at,client_updated_at)
      values(gen_random_uuid(),$1,'2026-11-07',now(),now())`, [user]);
    if (fixture.title === 'Training') { trainingPlayer = user; trainingProgram = program; }
  }
  await db.query("select public.queue_workout_reminders('2026-11-07')");
  await db.query("update public.notifications set is_read=true where type='workout_reminder'");
  await db.query("select public.queue_workout_reminders('2026-11-07')");
  expect((await db.query("select user_id,payload from public.notifications where type='workout_reminder'")).rows)
    .toEqual([{ user_id: trainingPlayer, payload: { day_title: 'Training', program_id: trainingProgram, training_date: '2026-11-07' } }]);
  await db.query("select public.queue_workout_reminders('2026-11-14')");
  expect((await db.query("select id from public.notifications where type='workout_reminder'")).rows).toHaveLength(3);
});
