import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite, captain: string, player: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
});
afterAll(async () => { await db.close(); });

it.each([
  ['Asia/Riyadh', '2026-03-28T21:30:00Z', '2026-03-29 00:30:00'],
  ['Asia/Dubai', '2026-03-28T21:30:00Z', '2026-03-29 01:30:00'],
  ['Europe/London', '2026-03-29T00:30:00Z', '2026-03-29 00:30:00'],
  ['Europe/London', '2026-03-29T01:30:00Z', '2026-03-29 02:30:00'],
  ['Europe/London', '2026-10-25T01:30:00Z', '2026-10-25 01:30:00'],
  ['Pacific/Auckland', '2026-11-03T12:30:00Z', '2026-11-04 01:30:00'],
  ['invalid/timezone', '2026-11-03T22:30:00Z', '2026-11-04 00:30:00'],
  [null, '2026-11-03T22:30:00Z', '2026-11-04 00:30:00'],
])('safely converts %s at %s', async (zone, stamp, expected) => {
  if (zone !== null) await db.query('update profiles set timezone=$1 where id=$2', [zone, player]);
  const result = await db.query(`select ($1::timestamptz at time zone public.safe_timezone($2))::text as local`,
    [stamp, zone === null ? null : player]);
  expect(result.rows).toEqual([{ local: expected }]);
});

it('uses the captain for access even when the player is already in tomorrow', async () => {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-03T12:30:00Z' $$`);
  await db.query(`update profiles set timezone=case when id=$1 then 'Europe/London' else 'Pacific/Auckland' end
    where id in ($1,$2)`, [captain, player]);
  await db.query(`update coach_clients set access_until='2026-11-03' where captain_id=$1`, [captain]);
  const result = await asUser(db, player, tx => tx.query(`select public.player_can_write() as allowed,
    public.user_today($1)::text as captain_day, public.user_today($2)::text as player_day`, [captain, player]));
  expect(result.rows).toEqual([{ allowed: true, captain_day: '2026-11-03', player_day: '2026-11-04' }]);
});

it('queues the player workout day and the captain expiry day once on retries', async () => {
  await db.query(`update coach_clients set access_until='2026-11-06' where player_id=$1`, [player]);
  const program = (await db.query<{ id: string }>(`insert into programs(captain_id,player_id,title,status)
    values($1,$2,'Tomorrow workout','active') returning id`, [captain, player])).rows[0]?.id;
  await db.query(`insert into program_days(program_id,position,weekday,title) values($1,1,4,'Wednesday')`, [program]);
  for (let i = 0; i < 2; i++) {
    await db.query('select public.queue_workout_reminders()');
    await db.query('select public.queue_expiry_reminders()');
  }
  expect((await db.query(`select payload->>'training_date' as day from notifications
    where user_id=$1 and type='workout_reminder'`, [player])).rows).toEqual([{ day: '2026-11-04' }]);
  expect((await db.query(`select user_id,payload->>'days_left' as days from notifications
    where type='subscription_expiring' order by user_id`)).rows).toEqual(
    [captain, player].sort().map(user_id => ({ user_id, days: '3' })));
});

it('runs forms in the recipient timezone while checking access in the captain timezone', async () => {
  const form = '00000000-0000-7000-8000-000000000183';
  await db.query(`update coach_clients set access_until='2026-11-03' where player_id=$1`, [player]);
  await db.query(`insert into forms(id,captain_id,title,kind,schedule) values($1,$2,'Local schedule','checkin',
    '{"every":"week","weekday":3,"hour":1}')`, [form, captain]);
  for (let i = 0; i < 2; i++) await db.query(`select public.queue_form_schedules('2026-11-03T12:30Z')`);
  expect((await db.query('select player_id from form_requests where form_id=$1', [form])).rows).toEqual([{ player_id: player }]);
});

it('expires access on the captain day even while the player is still in yesterday', async () => {
  await db.query(`update profiles set timezone=case when id=$1 then 'Pacific/Auckland' else 'Europe/London' end
    where id in($1,$2)`, [captain, player]);
  expect((await asUser(db, player, tx => tx.query(`select public.player_can_write() as allowed`))).rows)
    .toEqual([{ allowed: false }]);
});

it('deducts a PT workout on the player day while the captain subscription is still valid', async () => {
  await db.query(`update profiles set timezone=case when id=$1 then 'Europe/London' else 'Pacific/Auckland' end
    where id in($1,$2)`, [captain, player]);
  await db.query(`update coach_clients set sessions_left=2,billing_started_at='2026-11-02',access_until='2026-11-03'
    where player_id=$1`, [player]);
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
    values('00000000-0000-7000-8000-000000000184',$1,'2026-11-04',
      '2026-11-03T11:30Z','2026-11-03T12:30Z',now())`, [player]);
  expect((await db.query('select sessions_left from coach_clients where player_id=$1', [player])).rows)
    .toEqual([{ sessions_left: 1 }]);
});

it.each([
  ['2026-10-31T22:30:00Z', '2026-10-31T21:30:00Z', '2026-10-31', 1, 0],
  ['2026-11-01T08:00:00Z', '2026-11-01T07:00:00Z', '2026-11-01', 0, 1],
] as const)('attributes workout completions and scans to the captain month at %s', async (now, start, earned, oct, nov) => {
  const team = await createCaptainWithPlayer(db, '2026-10-01');
  // The injected SQL now() returns a literal; discard plans that inlined its previous value.
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '${now}' $$;
    discard plans;`);
  await db.query(`update profiles set timezone=case when id=$1 then 'Europe/London' else 'Pacific/Auckland' end
    where id in($1,$2)`, [team.captain, team.player]);
  const program = (await db.query<{ id: string }>(`insert into programs(captain_id,player_id,title,status)
    values($1,$2,'Plan','active') returning id`,
    [team.captain, team.player])).rows[0]?.id;
  await db.query('insert into program_days(program_id,position,weekday) values($1,1,1)', [program]);
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,'2026-11-01',$2,$3,now())`, [team.player, start, now]);
  const october = await asUser(db, team.captain, tx => tx.query(`select done from public.team_leaderboard('2026-10-01')`));
  expect(october.rows).toEqual([{ done: oct }]);
  const november = await asUser(db, team.captain, tx => tx.query(`select done from public.team_leaderboard('2026-11-01')`));
  expect(november.rows).toEqual([{ done: nov }]);
  await db.query(`insert into body_scans(id,player_id,scan_date,weight_kg)
    values(gen_random_uuid(),$1,'2026-11-01',75)`, [team.player]);
  expect((await db.query(`select kind,earned_on::text from points_log where player_id=$1
    and kind in ('inbody','perfect_week') order by kind`, [team.player])).rows)
    .toEqual([{ kind: 'inbody', earned_on: earned }, { kind: 'perfect_week', earned_on: earned }]);
});
