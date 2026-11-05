import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
let player: string;
let captain: string;
const start = (id: string, anonymous = true) => asUser(db, id,
  tx => tx.query('select public.create_demo_player_workspace()'), anonymous);
async function anonymous() {
  const result = await db.query<{ id: string }>(
    'insert into auth.users(id,is_anonymous) values(gen_random_uuid(),true) returning id');
  return result.rows[0]?.id ?? '';
}
beforeAll(async () => {
  db = await createTestDb();
  const library = readFileSync('supabase/seed/source/starter-templates.json', 'utf8');
  const exercises = [...new Set([...library.matchAll(/"dataset_id":\s*"(\d+)"/g)].map(m => m[1]))];
  const foods = [...new Set([...library.matchAll(/"seed_key":\s*"([^"]+)"/g)].map(m => m[1]))];
  await db.query(`insert into public.exercises(dataset_id,name_en,body_part)
    select id,'Exercise ' || id,'legs' from unnest($1::text[]) id`, [exercises]);
  await db.query(`insert into public.foods(seed_key,name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
    select id,id,130,10,20,3 from unnest($1::text[]) id`, [foods]);
  player = await anonymous();
});
afterAll(async () => { await db?.close(); });

it('provisions a writable player with a weekly workout today, nutrition and history', async () => {
  await start(player);
  const result = await db.query<{ captain_id: string; pending: boolean; role: string; days: number }>(`
    select c.captain_id,c.pending,p.role,c.access_until-(now() at time zone 'Africa/Cairo')::date as days
    from public.coach_clients c join public.profiles p on p.id=c.player_id where p.id=$1`, [player]);
  expect(result.rows[0]).toMatchObject({ role: 'player', pending: false, days: 30 });
  captain = result.rows[0]?.captain_id ?? '';
  expect((await db.query(`select id from public.profiles where id=$1 and role='captain'
    and demo_expires_at=now()+interval '24 hours'`, [captain])).rows).toHaveLength(1);
  expect((await asUser(db, player, tx => tx.query('select public.player_can_write() as ok'), true)).rows)
    .toEqual([{ ok: true }]);
  expect((await db.query(`select d.id from public.program_days d join public.programs p on p.id=d.program_id
    where p.player_id=$1 and p.status='active' and not d.is_rest_day
    and d.weekday=extract(dow from now() at time zone 'Africa/Cairo')`, [player])).rows).toHaveLength(1);
  for (const table of ['nutrition_plans', 'workout_sessions', 'set_logs', 'meal_logs']) {
    expect((await db.query(`select id from public.${table} where player_id=$1`, [player])).rows.length).toBeGreaterThan(0);
  }
  await start(player);
  expect((await db.query('select id from public.coach_clients where player_id=$1', [player])).rows).toHaveLength(1);
});
it('writes its own sets, meals and daily checks through normal RLS', async () => {
  await asUser(db, player, async tx => {
    await tx.query(`insert into public.daily_checks(id,player_id,log_date,sleep_hours,client_updated_at)
      values(gen_random_uuid(),$1,(now() at time zone 'Africa/Cairo')::date,8,now())`, [player]);
    await tx.query(`insert into public.meal_logs(id,player_id,meal_id,log_date,completed_at,client_updated_at)
      select gen_random_uuid(),$1,m.id,(now() at time zone 'Africa/Cairo')::date,now(),now()
      from public.meals m join public.nutrition_plans p on p.id=m.plan_id where p.player_id=$1 limit 1`, [player]);
    await tx.query(`insert into public.workout_sessions(id,player_id,program_day_id,training_date,started_at,client_updated_at)
      select gen_random_uuid(),$1,d.id,(now() at time zone 'Africa/Cairo')::date,now(),now()
      from public.program_days d join public.programs p on p.id=d.program_id
      where p.player_id=$1 and d.weekday=extract(dow from now() at time zone 'Africa/Cairo')`, [player]);
    const sets = await tx.query(`insert into public.set_logs(id,session_id,player_id,program_exercise_id,exercise_id,
      set_index,weight_kg,reps,completed_at,client_updated_at)
      select gen_random_uuid(),s.id,$1,e.id,e.exercise_id,0,20,10,now(),now()
      from public.workout_sessions s join public.program_exercises e on e.day_id=s.program_day_id
      where s.player_id=$1 and s.training_date=(now() at time zone 'Africa/Cairo')::date limit 1 returning id`, [player]);
    expect(sets.rows).toHaveLength(1);
  }, true);
});
it('cannot change its demo role or leave files outside the workspace purge', async () => {
  await expect(asUser(db, player, tx => tx.query('select public.create_demo_workspace()'), true))
    .rejects.toThrow('demo role already selected');
  await expect(asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name)
    values('checkin-photos',$1)`, [`${player}/photo.jpg`]), true)).rejects.toThrow('row-level security');
});
it('rejects permanent callers and isolates other tenants', async () => {
  const real = await createUser(db, 'captain');
  await expect(start(real, false)).rejects.toThrow('anonymous caller required');
  expect((await asUser(db, player, tx => tx.query('select id from public.profiles where id=$1', [real]), true)).rows).toEqual([]);
  await expect(asUser(db, player, tx => tx.query("select public.redeem_invite('missing')"), true)).rejects.toThrow();
  await db.query(`insert into public.coach_invites(captain_id,code,access_until)
    values($1,'real-demo-test',(now() at time zone 'Africa/Cairo')::date+30)`, [real]);
  await expect(asUser(db, player, tx => tx.query("select public.redeem_invite('real-demo-test')"), true))
    .rejects.toThrow('anonymous accounts are demo only');
  await db.query("update public.profiles set public_slug='real-demo-test' where id=$1", [real]);
  await expect(asUser(db, player, tx => tx.query(`insert into public.coach_join_requests(id,captain_id,player_id)
    values(gen_random_uuid(),$1,$2)`, [real,player]), true)).rejects.toThrow('invalid join request');
  const other = await anonymous();
  await start(other);
  for (const table of ['programs','nutrition_plans','workout_sessions','set_logs','meal_logs']) {
    expect((await asUser(db,player,tx => tx.query(`select id from public.${table} where player_id=$1`, [other]),true)).rows)
      .toEqual([]);
  }
  await db.query("update security_private.demo_workspaces set created_at=now()-interval '2 hours' where $1=any(player_ids)", [other]);
});
it('preserves active player workspaces even when the anonymous account is older', async () => {
  await db.query("update auth.users set created_at=now()-interval '25 hours' where id=$1", [player]);
  await db.exec('select security_private.purge_demo_workspaces()');
  expect((await db.query('select id from auth.users where id=$1', [player])).rows).toHaveLength(1);
});
it('shares the captain demo rate limit', async () => {
  await db.exec(`insert into security_private.demo_workspaces(captain_id)
    select gen_random_uuid() from generate_series(1,49)`);
  await expect(start(await anonymous())).rejects.toThrow('demo_limit');
  await db.query('delete from security_private.demo_workspaces where captain_id<>$1 and cardinality(player_ids)=0', [captain]);
});
it('purges both accounts and all player logs', async () => {
  await db.query("update security_private.demo_workspaces set expires_at=now()-interval '1 second' where captain_id=$1", [captain]);
  await db.exec('select security_private.purge_demo_workspaces()');
  expect((await db.query('select id from auth.users where id=any($1::uuid[])', [[captain, player]])).rows).toEqual([]);
  for (const table of ['profiles', 'workout_sessions', 'set_logs', 'meal_logs', 'daily_checks']) {
    const column = table === 'profiles' ? 'id' : 'player_id';
    expect((await db.query(`select id from public.${table} where ${column}=$1`, [player])).rows).toEqual([]);
  }
});
