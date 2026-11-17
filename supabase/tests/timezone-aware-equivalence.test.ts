import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite, captain: string, player: string, peer: string, anonymous: string;
let previous: string[] = [], current: string[] = [];
let previousContract: unknown[] = [];
let policyIds: number[] = [], previousPolicies: string[] = [], currentPolicies: string[] = [];
const migration = readFileSync('supabase/migrations/0097_timezone_aware_functions.sql', 'utf8');
const names = [...new Set([...migration.matchAll(/\('(public|security_private|ko_private)\.([a-z_]+)'/g)]
  .map(m => `${m[1]}.${m[2]}`))];
const definitions = async (database: PGlite) => (await database.query<{ definition: string }>(`
  select pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname||'.'||p.proname=any($1::text[]) order by p.oid`, [names])).rows.map(r => r.definition);
const contract = async (database: PGlite) => (await database.query(`select p.oid,p.proowner,p.proacl,
  p.prosecdef,p.provolatile,p.proconfig,pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as result from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname||'.'||p.proname=any($1::text[]) order by p.oid`, [names])).rows;
const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const secret = 'timezone-test-signing-key-123456789012345';
async function policies(database: PGlite) {
  const result = await database.query<{ oid: number; sql: string }>(`select p.oid,
    'alter policy '||quote_ident(p.polname)||' on '||p.polrelid::regclass::text||
    coalesce(' using ('||pg_get_expr(p.polqual,p.polrelid)||')','')||
    coalesce(' with check ('||pg_get_expr(p.polwithcheck,p.polrelid)||')','') as sql
    from pg_policy p where p.oid=any($1::oid[]) or ($2 and
      (pg_get_expr(p.polqual,p.polrelid) like '%Africa/Cairo%'
        or pg_get_expr(p.polwithcheck,p.polrelid) like '%Africa/Cairo%')) order by p.oid`,
  [policyIds, policyIds.length === 0]);
  policyIds = result.rows.map(r => r.oid);
  return result.rows.map(r => r.sql);
}

beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (file.startsWith('0097_')) {
      previous = await definitions(database);
      previousContract = await contract(database);
      previousPolicies = await policies(database);
    }
  });
  current = await definitions(db);
  currentPolicies = await policies(db);
  ({ captain, player } = await createCaptainWithPlayer(db, '2026-10-01'));
  peer = await createUser(db, 'player');
  anonymous = (await db.query<{ id: string }>(`insert into auth.users(id,is_anonymous)
    values(gen_random_uuid(),true) returning id`)).rows[0]?.id ?? '';
  const library = readFileSync('supabase/seed/source/starter-templates.json', 'utf8');
  const exercises = [...new Set([...library.matchAll(/"dataset_id":\s*"(\d+)"/g)].map(m => m[1]))];
  const foods = [...new Set([...library.matchAll(/"seed_key":\s*"([^"]+)"/g)].map(m => m[1]))];
  await db.query(`insert into exercises(dataset_id,name_en,body_part)
    select x,'Exercise '||x,'legs' from unnest($1::text[]) x`, [exercises]);
  await db.query(`insert into foods(seed_key,name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
    select x,x,130,10,20,3 from unnest($1::text[]) x`, [foods]);
  await db.query('insert into security_private.ko_approval_config(signing_key) values($1)', [secret]);
  await db.query(`insert into security_private.app_secrets(name,value) values('meal_receipt',$1)
    on conflict(name) do update set value=excluded.value`, [secret]);
});
afterAll(async () => { await db?.close(); });

async function actor(user: string, sql: string, args: (string | null)[] = [], demo = false) {
  await db.query(`select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)`,
    [user, JSON.stringify({ sub: user, role: 'authenticated', is_anonymous: demo })]);
  await db.exec('set local role authenticated');
  try { return (await db.query(sql, args)).rows; } finally { await db.exec('reset role'); }
}

// UUIDs and invite codes are intentionally generated; all business fields and
// multiplicities remain in the comparison, including notification payloads.
const canonical = (value: unknown) => JSON.stringify(value ?? null).replace(
  /[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/gi, '<uuid>');
async function snapshot() {
  const tables = (await db.query<{ name: string }>(`select tablename as name from pg_tables
    where schemaname='public' order by tablename`)).rows;
  const result: Record<string, string[]> = {};
  for (const { name } of tables) {
    const rows = await db.query(`select to_jsonb(t)-'code' as data from public.${name} t`);
    result[name] = rows.rows.map(canonical).sort();
  }
  return result;
}
async function run(defs: string[], policyDefinitions: string[], action: () => Promise<unknown>, old = false) {
  await db.exec('begin');
  try {
    for (const definition of defs) await db.exec(definition);
    for (const definition of policyDefinitions) await db.exec(definition);
    if (old) await db.exec('alter table coach_clients alter column started_on set default test_clock.today()');
    const result = canonical(await action());
    return { result, data: await snapshot() };
  } finally { await db.exec('rollback'); }
}
async function equivalent(action: () => Promise<unknown>) {
  const old = await run(previous, previousPolicies, action, true);
  expect(await run(current, currentPolicies, action)).toEqual(old);
}

it('preserves existing function OIDs, signatures, result types, security modes and ACLs', async () => {
  expect(await contract(db)).toEqual(previousContract);
  expect(previous).toHaveLength(names.length);
  for (let i = 0; i < previous.length; i++) {
    const old = previous[i]?.split('AS $function$')[0]?.replace(/ DEFAULT [^\n]+/g, '');
    const next = current[i]?.split('AS $function$')[0]?.replace(/ DEFAULT [^\n]+/g, '');
    expect(next).toBe(old);
  }
});

it('does not rewrite existing profiles, relationships or workout history during migration', async () => {
  let owner = '', before: unknown[] = [];
  // Later additive columns are not part of the 0097 snapshot.
  const sql = `select to_jsonb(c)-array['awaiting_plans_at','subscription_starts_on'] as link,to_jsonb(p)-array['specialties','years_experience','languages','show_public_stats','coach_gender','ramadan_mode','ramadan_training','ramadan_intensity','ramadan_water_ml','prayer_city','locale'] as profile,to_jsonb(s) as session
    from coach_clients c join profiles p on p.id=c.player_id
    join workout_sessions s on s.player_id=p.id where c.captain_id=$1`;
  const upgraded = await createTestDb(async (file, database) => {
    if (!file.startsWith('0097_')) return;
    const team = await createCaptainWithPlayer(database);
    owner = team.captain;
    await database.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
      values(gen_random_uuid(),$1,'2026-11-03',now(),now())`, [team.player]);
    before = (await database.query(sql, [owner])).rows;
  });
  try { expect((await upgraded.query(sql, [owner])).rows).toEqual(before); }
  finally { await upgraded.close(); }
});

it('matches old Cairo access, renewal, activity, boards, feeds and workout notifications', async () => equivalent(async () => {
  await db.query(`insert into programs(id,captain_id,player_id,title,status)
    values($1,$2,$3,'Week','draft')`, [id(1), captain, player]);
  await db.query(`insert into program_days(id,program_id,position,weekday,title)
    values($1,$2,1,3,'Tuesday')`, [id(2), id(1)]);
  await db.query(`insert into program_cardio(day_id,position,kind,minutes,intensity)
    values($1,1,'Walk',20,'low')`, [id(2)]);
  await actor(captain, 'select public.activate_program($1)', [id(1)]);
  const draft = { id: id(1), player_id: player, title: 'Week', repeatWeekly: true, days: [
    { id: id(2), program_id: id(1), position: 1, weekday: 3, title: 'Tuesday', exercises: [],
      cardio: [{ id: id(3), day_id: id(2), position: 1, kind: 'Walk', minutes: 20, intensity: 'low' }] },
  ] };
  await actor(captain, 'select public.save_weekly_program($1)', [JSON.stringify(draft)]);
  await db.query('select public.queue_workout_reminders()');
  await db.query('select public.queue_workout_reminders()');
  const body = Buffer.from(JSON.stringify({ actor: captain, id: id(99), player, kind: 'reminder',
    payload: { date: '2026-11-03' }, expires: Date.parse(TEST_NOW) + 60_000 })).toString('base64url');
  await actor(captain, 'select ko_private.workout_reminder($1)',
    [body + '.' + createHmac('sha256', secret).update(body).digest('hex')]);
  await db.query(`update coach_clients set sessions_left=2,billing_started_at='2026-11-01' where player_id=$1`, [player]);
  await db.query(`insert into workout_sessions(id,player_id,program_day_id,training_date,started_at,
    completed_at,client_updated_at,session_rpe,player_note)
    values($1,$2,$3,'2026-11-03','2026-11-03T08:00Z','2026-11-03T09:00Z',now(),9,'Feedback')`,
    [id(4), player, id(2)]);
  await db.query('select security_private.award_session_points($1)', [id(4)]);
  await db.query(`insert into body_scans(id,player_id,scan_date,weight_kg) values($1,$2,'2026-11-03',75)`, [id(5), player]);
  const receipt = createHmac('sha256', secret).update(player + ':2026-11-03').digest('hex');
  await actor(player, `select public.award_meal_check('2026-11-03',$1)`, [receipt]);
  const access = await actor(player, 'select public.player_can_read(),public.player_can_read_from($1),public.player_can_write()', [captain]);
  // Same-clock UUIDs have random suffixes; ledger contents are compared in the snapshot.
  const mine = await actor(player, `select public.my_points()-'logs' as points`);
  const board = await actor(captain, 'select * from public.team_leaderboard()');
  const boundary = await actor(captain, 'select public.captain_since($1)', [player]);
  const history = [];
  for (const table of ['workout_sessions', 'set_logs', 'meal_logs', 'supplement_logs',
    'daily_checks', 'body_scans', 'readiness_decisions', 'check_ins', 'form_checks']) {
    history.push(await actor(captain, `select * from public.${table}`));
  }
  const radar = await actor(captain, 'select * from public.captain_dropout_radar()');
  const feed = await actor(player, 'select * from public.ko_feed()');
  await actor(captain, 'select public.refresh_inactive_alerts()');
  await actor(captain, 'select public.renew_player($1,14)', [player]);
  await db.query(`update coach_clients set access_until='2026-11-06' where player_id=$1`, [player]);
  await db.query('select public.queue_expiry_reminders()');
  await db.query('select public.queue_expiry_reminders()');
  await db.query(`select public.queue_crown_reminders('2026-11-28')`);
  await db.query(`select security_private.freeze_crown_winners('2026-10-01')`);
  return { access, mine, board, boundary, history, radar, feed };
}));

it('matches old Cairo form scheduling, manual send, and both reminder paths', async () => equivalent(async () => {
  await db.query(`insert into forms(id,captain_id,title,kind,schedule,remind_after_hours)
    values($1,$2,'Weekly','checkin','{"every":"week","weekday":2,"hour":12}',1)`, [id(10), captain]);
  await db.query('select public.queue_form_schedules($1)', [TEST_NOW]);
  await db.query('select public.queue_form_schedules($1)', [TEST_NOW]);
  await actor(captain, 'select public.send_custom_form_request($1,$2,$3)', [id(11), id(10), player]);
  const request = (await db.query<{ id: string }>('select id from form_requests where form_id=$1', [id(10)])).rows[0]?.id ?? '';
  const reminded = await actor(captain, 'select public.remind_custom_form_request($1)', [request]);
  await db.query(`update form_requests set reminded_at=null where id=$1`, [request]);
  await db.query(`delete from notifications where payload->>'request_id'=$1`, [request]);
  await db.query(`select public.queue_form_reminders('2026-11-03T11:00Z')`);
  await db.query(`select public.queue_form_reminders('2026-11-03T11:00Z')`);
  return reminded;
}));

it('matches old Cairo join-request triggers, link attachment, activation and invite creation', async () => equivalent(async () => {
  await db.query(`update profiles set public_slug='timezone-captain' where id=$1`, [captain]);
  await actor(peer, `insert into coach_join_requests(id,captain_id,player_id) values($1,$2,$3)`, [id(20), captain, peer]);
  await actor(captain, `select public.resolve_coach_join_request($1,'accepted',$2)`, [id(20), id(21)]);
  await actor(captain, `select public.activate_player($1,null,'days',7,100,50,false)`, [id(20)]);
  await actor(captain, `select public.create_player_invite('Ali',null,null,'days',7,100,50,false,'2026-11-03')`);
  await db.query(`update coach_clients set archived_at=now() where player_id=$1`, [peer]);
  await db.query(`select security_private.attach_coach_player($1,$2,$3,'2026-12-01')`, [id(22), captain, peer]);
}));

it.each(['public.create_demo_workspace', 'public.create_demo_player_workspace'])(
  'matches old Cairo %s including assignment and generated workout/meal history', async name => equivalent(async () => {
    await actor(anonymous, `select ${name}()`, [], true);
  }));
