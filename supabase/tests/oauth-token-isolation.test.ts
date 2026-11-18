import { readdirSync, readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let otherCaptain: string;
let otherPlayer: string;
const id = '01900000-0000-7000-8000-000000000001';

const run = (oauth: boolean, sql: string, params: unknown[] = [], method = '', path = '', user = captain) =>
  asUser(db, user, async tx => {
    const claims = { sub: user, role: 'authenticated', ...(oauth ? { client_id: 'test-client' } : {}) };
    await tx.query(`select set_config('request.jwt.claims', $1, true),
      set_config('request.method', $2, true), set_config('request.path', $3, true)`,
    [JSON.stringify(claims), method, path]);
    return tx.query(sql, params);
  });

const gate = (oauth: boolean, method: string, path: string) =>
  run(oauth, 'select public.oauth_request_gate()', [], method, path);

beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (file === '0155_oauth_token_isolation.sql') {
      await database.exec('create role authenticator noinherit login; grant usage on schema auth to anon, service_role');
    }
  });
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: otherCaptain, player: otherPlayer } = await createCaptainWithPlayer(db));
  await db.query('update public.profiles set role_confirmed = true where id in ($1,$2)', [captain, otherCaptain]);
});
afterAll(async () => { await db?.close(); });

it.each([
  ['GET', '/programs'],
  ['HEAD', '/program_exercises'],
  ['POST', '/rpc/captain_roster'],
])('allows OAuth %s %s', async (method, path) => {
  await expect(gate(true, method, path)).resolves.toBeDefined();
});

it.each([
  ['POST', '/rpc/ko_apply_action'],
  ['POST', '/workout_sessions'],
  ['PATCH', '/profiles'],
  ['GET', '/meal_logs'],
  ['GET', '/rpc/captain_roster'],
  ['GET', '/programs/extra'],
  ['', ''],
])('denies OAuth %s %s', async (method, path) => {
  await expect(gate(true, method, path)).rejects.toMatchObject({
    code: '42501', message: 'not available to connected apps',
  });
});

it.each([['POST', '/rpc/ko_apply_action'], ['PATCH', '/profiles']])(
  'allows first-party %s %s', async (method, path) => {
    await expect(gate(false, method, path)).resolves.toBeDefined();
  },
);

it('lets a request without a JWT pass as anon', async () => {
  await db.transaction(async tx => {
    await tx.exec('set local role anon');
    await tx.query('select public.oauth_request_gate()');
  });
});

it('lets a service-role request pass and registers the PostgREST hook', async () => {
  await db.transaction(async tx => {
    await tx.exec('set local role service_role');
    await tx.query('select public.oauth_request_gate()');
  });
  const { rows } = await db.query(`select unnest(setconfig) as setting
    from pg_db_role_setting where setrole = 'authenticator'::regrole and setdatabase = 0`);
  expect(rows).toContainEqual({ setting: 'pgrst.db_pre_request=public.oauth_request_gate' });
});

it.each([
  ['exercises', 'name_en', 'owner_id,name_en,body_part', "$2,'Press','chest'"],
  ['programs', 'title', 'captain_id,title,is_template', "$2,'Plan',true"],
  ['nutrition_plans', 'title', 'captain_id,title,is_template', "$2,'Plan',true"],
])('blocks direct OAuth inserts, updates and deletes on %s', async (table, column, columns, values) => {
  const insert = `insert into public.${table} (id,${columns}) values ($1,${values}) returning id`;
  const update = `update public.${table} set ${column} = 'Updated' where id = $1 returning id`;
  const remove = `delete from public.${table} where id = $1 returning id`;
  await expect(run(true, insert, [id, captain])).rejects.toMatchObject({ code: '42501' });
  expect((await run(false, insert, [id, captain])).rows).toEqual([{ id }]);
  expect((await run(true, update, [id])).rows).toEqual([]);
  expect((await run(true, remove, [id])).rows).toEqual([]);
  expect((await run(false, update, [id])).rows).toEqual([{ id }]);
  expect((await run(false, remove, [id])).rows).toEqual([{ id }]);
});

it('hides non-allowlisted rows from OAuth even without the gate', async () => {
  await db.query(`insert into public.notifications (user_id, type) values ($1, 'player_joined')`, [captain]);
  const select = 'select user_id from public.notifications';
  expect((await run(false, select)).rows.length).toBeGreaterThan(0);
  expect((await run(true, select)).rows).toEqual([]);
});

it('preserves captain RLS across allowed program, day and exercise reads', async () => {
  const seed = `with program as (
    insert into public.programs (captain_id, player_id, title) values ($1,$2,$3) returning id
  ), day as (
    insert into public.program_days (program_id, position) select id,1 from program returning id
  ), exercise as (
    insert into public.exercises (name_en, body_part) values ('Press','chest') returning id
  )
  insert into public.program_exercises (day_id, exercise_id, position, sets, reps_min)
    select day.id,exercise.id,1,3,8 from day,exercise`;
  await db.query(seed, [captain, player, 'Own plan']);
  await db.query(seed, [otherCaptain, otherPlayer, 'Other plan']);
  const select = `select p.title, d.position as day, e.sets from public.programs p
    join public.program_days d on d.program_id = p.id
    join public.program_exercises e on e.day_id = d.id`;
  for (const oauth of [true, false]) {
    expect((await run(oauth, select)).rows).toEqual([{ title: 'Own plan', day: 1, sets: 3 }]);
  }
});

it('blocks OAuth access to private storage objects', async () => {
  const name = `${player}/${id}.jpg`;
  const insert = "insert into storage.objects (bucket_id, name) values ('body-scans', $1)";
  const read = 'select name from storage.objects where name = $1';
  await expect(run(true, insert, [name], '', '', player)).rejects.toMatchObject({ code: '42501' });
  await run(false, insert, [name], '', '', player);
  expect((await run(false, read, [name], '', '', player)).rows).toEqual([{ name }]);
  expect((await run(true, read, [name], '', '', player)).rows).toEqual([]);
});

it('allows exactly the RPCs used by AI tools and MCP', async () => {
  const rpcPaths = new Set<string>();
  for (const feature of ['ai-tools', 'mcp']) {
    const root = new URL(`../../src/features/${feature}/`, import.meta.url);
    for (const file of readdirSync(root, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      const source = readFileSync(new URL(file.replaceAll('\\', '/'), root), 'utf8');
      for (const [, name] of source.matchAll(/\brpc\(\s*['"]([a-z_0-9]+)['"]/g)) rpcPaths.add(`/rpc/${name}`);
    }
  }
  const { rows } = await db.query<{ body: string }>(
    "select prosrc as body from pg_proc where oid = 'public.oauth_request_gate()'::regprocedure",
  );
  const body = rows[0]?.body ?? '';
  const gatePaths = [...body.matchAll(/'\/rpc\/[a-z_0-9]+'/g)].map(([match]) => match.slice(1, -1));
  expect(gatePaths.sort()).toEqual([...rpcPaths].sort());
  for (const path of gatePaths) await expect(gate(true, 'POST', path)).resolves.toBeDefined();
});
