import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let admin: string;
let other: string;
const program = '00000000-0000-7000-8000-000000000001';
const plan = '00000000-0000-7000-8000-000000000002';
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, (tx) => tx.query(sql, params));
const suspend = (user: string, value: boolean) => run(admin, 'select public.admin_set_suspended($1, $2, $3)', [user, value, 'test']);

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  admin = await createUser(db, 'captain');
  await makeAdmin(db, admin);
  other = await createUser(db, 'captain');
  await db.query(`insert into public.programs (id, captain_id, player_id, title, status)
    values ($1, $2, $3, 'Training', 'active')`, [program, captain, player]);
  await db.query(`insert into public.nutrition_plans (id, captain_id, player_id, title, status)
    values ($1, $2, $3, 'Nutrition', 'active')`, [plan, captain, player]);
  await db.query(`insert into public.program_days (program_id, position) values ($1, 1)`, [program]);
  await db.query(`insert into public.meals (plan_id, name, position) values ($1, 'Meal', 1)`, [plan]);
  await run(other, `insert into public.programs (captain_id, is_template, title) values ($1, true, 'Other')`, [other]);
  await db.query(`insert into public.workout_sessions
    (id, player_id, training_date, started_at, client_updated_at)
    values (gen_random_uuid(), $1, test_clock.today(), now(), now())`, [player]);
  await db.query(`insert into public.meal_logs (id, player_id, log_date, client_updated_at)
    values (gen_random_uuid(), $1, test_clock.today(), now())`, [player]);
  await run(player, `insert into public.player_intake
    (player_id, birth_year, sex, height_cm, weight_kg, training_days, session_minutes, experience)
    values ($1, 2000, 'male', 180, 80, array[1,3]::smallint[], 60, 'new')`, [player]);
  await run(player, `insert into public.check_ins (player_id, week_start) values ($1, test_clock.today())`, [player]);
  await run(player, `insert into storage.objects (bucket_id, name) values ('checkin-photos', $1)`, [`${player}/photo.jpg`]);
  await run(player, `insert into storage.objects (bucket_id, name) values ('form-videos', $1)`, [`${player}/video.mp4`]);
});
afterAll(async () => { await db?.close(); });

it('requires a restrictive active_caller policy on every public table', async () => {
  const { rows } = await db.query(`select t.tablename from pg_tables t
    where t.schemaname = 'public' and not exists (
      select 1 from pg_policies p where p.schemaname = t.schemaname and p.tablename = t.tablename
      and p.policyname = 'active_caller' and p.permissive = 'RESTRICTIVE'
      and 'authenticated' = any(p.roles)
      and p.cmd = case when t.tablename = 'profiles' then 'SELECT' else 'ALL' end)`);
  expect(rows).toEqual([]);
  expect((await db.query(`select cmd from pg_policies where schemaname = 'public'
    and tablename = 'profiles' and permissive = 'RESTRICTIVE' order by cmd`)).rows)
    .toEqual([{ cmd: 'DELETE' }, { cmd: 'INSERT' }, { cmd: 'SELECT' }, { cmd: 'UPDATE' }]);
});

it('blocks renewal, archiving, content CRUD and review with the same authenticated identity', async () => {
  expect((await run(captain, 'select * from public.coach_clients')).rows).toHaveLength(1);
  await suspend(captain, true);
  for (const assignment of ['access_until = test_clock.today() + 365', 'archived_at = now()']) {
    expect((await run(captain, `update public.coach_clients set ${assignment} returning id`)).rows).toEqual([]);
  }
  for (const table of ['programs', 'nutrition_plans']) {
    expect((await run(captain, `select * from public.${table}`)).rows).toEqual([]);
    await expect(run(captain, `insert into public.${table} (captain_id, is_template, title)
      values ($1, true, 'Blocked')`, [captain])).rejects.toMatchObject({ code: '42501' });
    expect((await run(captain, `update public.${table} set title = 'Blocked' returning id`)).rows).toEqual([]);
    expect((await run(captain, `delete from public.${table} returning id`)).rows).toEqual([]);
  }
  expect((await run(captain, `update public.check_ins set captain_reply = 'Blocked', reviewed_at = now() returning id`)).rows)
    .toEqual([]);
  for (const table of ['player_intake', 'workout_sessions', 'meal_logs']) {
    expect((await run(captain, `select * from public.${table}`)).rows).toEqual([]);
    expect((await run(player, `select * from public.${table}`)).rows).toHaveLength(1);
  }
  expect((await run(captain, 'select * from storage.objects')).rows).toEqual([]);
  expect((await run(player, 'select * from storage.objects')).rows).toHaveLength(2);
  expect((await run(captain, 'select id, suspended_at is not null as suspended from public.profiles')).rows)
    .toEqual([{ id: captain, suspended: true }]);
  expect((await run(other, 'select * from public.plan_tiers')).rows).toHaveLength(4);
  expect((await run(other, `update public.programs set title = 'Still active' where title = 'Other' returning title`)).rows)
    .toEqual([{ title: 'Still active' }]);
  for (const table of ['program_days', 'meals']) {
    expect((await run(captain, `select * from public.${table}`)).rows).toEqual([]);
    expect((await run(player, `select * from public.${table}`)).rows).toHaveLength(1);
  }
  expect((await run(player, 'select id from public.programs')).rows).toEqual([{ id: program }]);
  expect((await run(player, 'select id from public.nutrition_plans')).rows).toEqual([{ id: plan }]);
  await suspend(captain, false);
  expect((await run(captain, `update public.coach_clients set access_until = test_clock.today() + 60 returning id`)).rows).toHaveLength(1);
  expect((await run(captain, 'select * from storage.objects')).rows).toHaveLength(2);
});

it('denies template RPCs and every guarded data definer while suspended', async () => {
  await suspend(captain, true);
  for (const [sql, params] of [
    ['select public.program_to_template($1, $2)', [program, 'Template']],
    ['select public.nutrition_plan_to_template($1, $2)', [plan, 'Template']],
    ['select public.assign_program_template($1, $2)', [program, player]],
    ['select public.assign_nutrition_template($1, $2)', [plan, player]],
  ] as const) await expect(run(captain, sql, [...params])).rejects.toThrow();
  for (const sql of [
    `select public.redeem_invite('missing')`, `select public.confirm_role('captain')`,
    `select public.invite_preview('missing')`, 'select public.request_account_deletion()',
    'select public.cancel_account_deletion()', `select public.renew_player('${player}', 30)`,
    `select public.is_captain_of('${player}')`, 'select public.my_captain_id()',
    'select public.player_can_write()', `select public.can_edit_program('${program}')`,
    `select public.can_edit_plan('${plan}')`, `select public.owns_meal('${plan}')`,
    `select public.owns_session('${plan}')`, `select public.owns_program_day('${plan}')`,
    `select public.owns_program_exercise('${plan}')`,
  ]) await expect(run(captain, sql)).rejects.toMatchObject({ code: '42501' });
  await suspend(captain, false);
});

it('keeps anonymous invite previews working without granting anonymous access to other definers', async () => {
  const result = await db.transaction(async (tx) => {
    await tx.exec('set local role anon');
    return tx.query(`select * from public.invite_preview('missing')`);
  });
  expect(result.rows).toEqual([{ captain_name: null, valid: false }]);
});

it('denies all admin RPCs and returns false from is_admin for a suspended admin', async () => {
  const blockedAdmin = await createUser(db, 'captain');
  await makeAdmin(db, blockedAdmin);
  await suspend(blockedAdmin, true);
  expect((await run(blockedAdmin, 'select public.is_admin() as allowed')).rows).toEqual([{ allowed: false }]);
  for (const sql of ['select * from public.admin_captains()',
    `select public.admin_set_suspended('${captain}', false, 'test')`,
    `select public.admin_activate_plan('${captain}', 'legend', 1, 'cash')`]) {
    await expect(run(blockedAdmin, sql)).rejects.toMatchObject({ code: '42501' });
  }
});

it('denies a suspended player uploads, profile writes and own history', async () => {
  await suspend(player, true);
  await expect(run(player, `insert into storage.objects (bucket_id, name) values ('form-videos', $1)`, [`${player}/blocked.mp4`]))
    .rejects.toMatchObject({ code: '42501' });
  expect((await run(player, 'select * from public.meal_logs')).rows).toEqual([]);
  expect((await run(player, 'select * from storage.objects')).rows).toEqual([]);
  await expect(run(player, `update public.profiles set full_name = 'Blocked' returning id`)).rejects.toMatchObject({ code: '42501' });
  expect((await run(player, 'select id from public.profiles')).rows).toEqual([{ id: player }]);
  await suspend(player, false);
  expect((await run(player, 'select * from public.meal_logs')).rows).toHaveLength(1);
});
