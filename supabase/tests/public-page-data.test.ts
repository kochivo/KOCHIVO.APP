import { afterAll, beforeAll, expect, expectTypeOf, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser, dayOffset } from './harness';
import { publicProfileLanguages } from '../../src/types/enums';
import type { AppDatabase } from '../../src/types/app-database';

let db: PGlite;
let captain: string;
let players: string[];
let legacy: unknown;
let previousProfile: unknown;
let previousFunction: unknown;
beforeAll(async () => {
  db = await createTestDb(async (file, sql) => {
    if (!file.startsWith('0103_')) return;
    captain = await createUser(sql, 'captain', 'Public coach');
    await sql.query("update profiles set public_slug='public-coach',bio='Existing bio' where id=$1", [captain]);
    legacy = (await sql.query('select * from coach_public_profile($1)', ['public-coach'])).rows;
    previousProfile = (await sql.query('select to_jsonb(p) profile from profiles p where id=$1', [captain])).rows;
    previousFunction = (await sql.query("select pg_get_functiondef('coach_public_profile(text)'::regprocedure)")).rows;
  });
  players = [];
});
afterAll(async () => { await db?.close(); });
async function page() {
  return db.transaction(async tx => {
    await tx.exec('set local role anon');
    return (await tx.query('select * from coach_public_page($1)', ['public-coach'])).rows;
  });
}
async function stats() {
  return db.transaction(async tx => {
    await tx.exec('set local role anon');
    return (await tx.query<{ stats: unknown }>('select coach_public_stats($1) stats', ['public-coach'])).rows[0]?.stats;
  });
}
async function addPlayer() {
  const player = await createUser(db, 'player');
  await db.query('insert into coach_clients(captain_id,player_id,access_until,started_on) values ($1,$2,$3,$4)',
    [captain, player, await dayOffset(db, 30), await dayOffset(db, -30)]);
  players.push(player);
  return player;
}

it('preserves old profile values and the old public RPC projection', async () => {
  expect((await db.query(`select to_jsonb(p)-'locale'-'specialties'-'years_experience'-'languages'-'show_public_stats'-'coach_gender'-array['ramadan_mode','ramadan_training','ramadan_intensity','ramadan_water_ml','prayer_city'] profile
    from profiles p where id=$1`, [captain])).rows).toEqual(previousProfile);
  expect((await db.query("select pg_get_functiondef('coach_public_profile(text)'::regprocedure)")).rows).toEqual(previousFunction);
  expect((await db.query('select * from coach_public_profile($1)', ['public-coach'])).rows).toEqual(legacy);
  expect(await page()).toEqual([{
    specialties: [], years_experience: null, languages: [], show_public_stats: false, spots_left: 5, accepting: true, coach_gender: null,
  }]);
});

it('keeps RPC security properties, table defaults, constraints and language types in sync', async () => {
  type Functions = AppDatabase['public']['Functions'];
  expectTypeOf<AppDatabase['public']['Tables']['coach_waitlist']['Update']>().toEqualTypeOf<never>();
  expectTypeOf<Functions['coach_public_page']['Returns'][number]['years_experience']>().toEqualTypeOf<number | null>();
  expectTypeOf<Functions['coach_public_stats']['Returns']>().toEqualTypeOf<{
    players: number; workouts_logged: number; adherence_pct: number; member_since: number;
  } | null>();
  const { rows } = await db.query(`select proname,provolatile,prosecdef,proconfig from pg_proc
    where oid in ('coach_public_page(text)'::regprocedure,'coach_public_stats(text)'::regprocedure)`);
  for (const row of rows) expect(row).toMatchObject({ provolatile: 's', prosecdef: true, proconfig: ['search_path=""'] });
  const checks = await db.query<{ definition: string }>(`select pg_get_constraintdef(oid) definition from pg_constraint
    where conrelid='profiles'::regclass and conname='profiles_languages_check'`);
  expect([...checks.rows[0]?.definition.matchAll(/'([^']+)'::text/g) ?? []].map(match => match[1]))
    .toEqual([...publicProfileLanguages]);
  expect((await db.query(`select bio,specialties,years_experience,languages,show_public_stats
    from profiles where id=$1`, [captain])).rows).toEqual([{
    bio: 'Existing bio', specialties: [], years_experience: null, languages: [], show_public_stats: false,
  }]);
});

it('uses active subscription limits and falls back after expiry', async () => {
  await db.query(`insert into captain_subscriptions(captain_id,tier,starts_at,ends_at,amount_egp,activated_by)
    values ($1,'champion',now()-interval '1 day',now()+interval '1 day',399,$1)`, [captain]);
  expect((await page())[0]).toMatchObject({ spots_left: 20, accepting: true });
  await db.query("update captain_subscriptions set ends_at=now() where captain_id=$1", [captain]);
  expect((await page())[0]).toMatchObject({ spots_left: 5, accepting: true });
});

it('grants profile edits and validates every array element, bounds and null elements', async () => {
  await asUser(db, captain, tx => tx.query(`update profiles set specialties=array['Strength'],
    years_experience=8,languages=array['ar','en'],show_public_stats=true where id=$1`, [captain]));
  for (const assignment of [
    "specialties=array['x']", "specialties=array[repeat('a',31)]", "specialties=array_fill('ok'::text,array[7])",
    'specialties=array[null]::text[]', "specialties=array[['ok','ok']]", 'years_experience=-1', 'years_experience=61',
    "languages=array['fr']", 'languages=array[null]::text[]', 'show_public_stats=null',
  ]) {
    await expect(asUser(db, captain, tx => tx.query(`update profiles set ${assignment} where id=$1`, [captain]))).rejects.toThrow();
  }
  expect(await stats()).toBeNull();
});

it('hides stats below five live players and when disabled', async () => {
  for (let n = 0; n < 4; n++) await addPlayer();
  expect(await stats()).toBeNull();
  await addPlayer();
  await db.query('update profiles set show_public_stats=false where id=$1', [captain]);
  expect(await stats()).toBeNull();
  await db.query('update profiles set show_public_stats=true where id=$1', [captain]);
  expect(await stats()).toEqual({ players: 5, workouts_logged: 0, adherence_pct: 0, member_since: 2026 });
});

it('returns only aggregates, counts completed history and deduplicates scheduled daily completions', async () => {
  const player = players[0];
  const { rows } = await db.query<{ id: string }>(`insert into programs(captain_id,player_id,title,status,created_at)
    values ($1,$2,'Schedule','active',now()-interval '30 days') returning id`, [captain, player]);
  const program = rows[0]?.id;
  await db.query(`insert into program_days(program_id,position,title,weekday,is_rest_day)
    select $1,n,'Day',n,false from generate_series(0,6) n`, [program]);
  for (const offset of [0, 0, -1, -6, -7, 1]) {
    await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
      values (gen_random_uuid(),$1,$2,now(),now(),now())`, [player, await dayOffset(db, offset)]);
  }
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
    values (gen_random_uuid(),$1,$2,now(),now())`, [player, await dayOffset(db, -2)]);
  expect(await stats()).toEqual({ players: 5, workouts_logged: 6, adherence_pct: 43, member_since: 2026 });
  expect(Object.keys(await stats() as object).sort()).toEqual(['adherence_pct', 'member_since', 'players', 'workouts_logged']);
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [players[4]]);
  expect(await stats()).toBeNull();
  await db.query('update coach_clients set archived_at=null where player_id=$1', [players[4]]);
});

it('uses the enforced tier, excludes demos and floors over-capacity spots at zero', async () => {
  expect((await page())[0]).toMatchObject({ spots_left: 0, accepting: false });
  await db.query('update plan_tiers set player_limit=4 where tier=\'entry\'');
  expect((await page())[0]).toMatchObject({ spots_left: 0, accepting: false });
  await db.query('update plan_tiers set player_limit=6 where tier=\'entry\'');
  expect((await page())[0]).toMatchObject({ spots_left: 1, accepting: true });
  await db.query('update plan_tiers set player_limit=5 where tier=\'entry\'');
  const demo = await createUser(db, 'player');
  await db.query("update profiles set demo_expires_at=now()+interval '1 day' where id=$1", [demo]);
  await db.query('insert into coach_clients(captain_id,player_id,access_until) values ($1,$2,$3)',
    [captain, demo, await dayOffset(db, 30)]);
  expect((await page())[0]).toMatchObject({ spots_left: 0 });
  expect(await stats()).toMatchObject({ players: 5 });
});

it('applies the existing eligibility filter to both new RPCs', async () => {
  for (const change of ["captain_status='pending'", 'role_confirmed=false', 'suspended_at=now()',
    "demo_expires_at=now()+interval '1 day'"]) {
    await db.transaction(async tx => {
      await tx.exec('savepoint eligibility');
      await tx.query(`update profiles set ${change} where id=$1`, [captain]);
      expect((await tx.query('select * from coach_public_page($1)', ['public-coach'])).rows).toEqual([]);
      expect((await tx.query<{ s: unknown }>('select coach_public_stats($1) s', ['public-coach'])).rows[0]?.s).toBeNull();
      await tx.exec('rollback to savepoint eligibility');
    });
  }
  await db.query('insert into admins(user_id) values ($1)', [captain]);
  expect(await page()).toEqual([]);
  expect(await stats()).toBeNull();
  await db.query('delete from admins where user_id=$1', [captain]);
  expect((await db.query('select * from coach_public_page(\'missing\')')).rows).toEqual([]);
});

it('isolates waitlist writes and reads, preserves pending uniqueness and denies client notification edits', async () => {
  const player = await createUser(db, 'player');
  const other = await createUser(db, 'player');
  const insert = (actor: string, owner = actor) => asUser(db, actor, tx => tx.query(`insert into coach_waitlist
    (id,captain_id,player_id) values (gen_random_uuid(),$1,$2)`, [captain, owner]));
  await db.query('update plan_tiers set player_limit=6 where tier=\'entry\'');
  await expect(insert(player)).rejects.toThrow(/row-level security/);
  await db.query('update plan_tiers set player_limit=5 where tier=\'entry\'');
  await expect(insert(player, other)).rejects.toThrow();
  await expect(insert(captain)).rejects.toThrow();
  await expect(asUser(db, player, tx => tx.query(`insert into coach_waitlist(id,captain_id,player_id)
    values(gen_random_uuid(),$1,$2)`, [captain, player]), true)).rejects.toThrow();
  await insert(player);
  const row = (await db.query<{ id: string }>('select id from coach_waitlist')).rows[0];
  const withdraw = (actor: string) => asUser(db, actor, tx => tx.query('select leave_coach_waitlist($1)', [row?.id]));
  await expect(insert(player)).rejects.toThrow(/unique/);
  expect((await asUser(db, captain, tx => tx.query('select * from coach_waitlist'))).rows).toHaveLength(1);
  expect((await asUser(db, other, tx => tx.query('select * from coach_waitlist'))).rows).toEqual([]);
  expect((await asUser(db, player, tx => tx.query('select * from coach_waitlist'))).rows).toEqual([]);
  await expect(asUser(db, player, tx => tx.query('update coach_waitlist set notified_at=now()'))).rejects.toThrow();
  await asUser(db, other, tx => tx.query('delete from coach_waitlist'));
  await withdraw(other);
  await withdraw(captain);
  expect((await db.query('select * from coach_waitlist')).rows).toHaveLength(1);
  await db.query('update plan_tiers set player_limit=6 where tier=\'entry\'');
  await withdraw(player);
  expect((await db.query('select * from coach_waitlist')).rows).toHaveLength(1);
  await db.query('update plan_tiers set player_limit=5 where tier=\'entry\'');
  await db.query('update profiles set suspended_at=now() where id=$1', [player]);
  await expect(withdraw(player)).rejects.toThrow();
  await asUser(db, player, tx => tx.query('delete from coach_waitlist'));
  expect((await db.query('select * from coach_waitlist')).rows).toHaveLength(1);
  await db.query('update profiles set suspended_at=null where id=$1', [player]);
  await asUser(db, player, tx => tx.query('delete from coach_waitlist where id=$1', [row?.id]));
  expect((await db.query('select * from coach_waitlist')).rows).toHaveLength(1);
  await withdraw(player);
  expect((await db.query('select * from coach_waitlist')).rows).toEqual([]);
  await insert(player);
  await db.query('update coach_waitlist set notified_at=now()');
  await insert(player);
  expect((await db.query('select * from coach_waitlist')).rows).toHaveLength(2);
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    await tx.query('select * from coach_waitlist');
  })).rejects.toThrow();
});
