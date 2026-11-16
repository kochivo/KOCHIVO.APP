import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
const id = (n: number) => `00000332-0000-7000-8000-${String(n).padStart(12, '0')}`;

it('reproduces the pre-fix set-log blocker and rollback of the entire overdue batch', async () => {
  const baseline = await createTestDb(async (file, probe) => {
    if (file !== '0134_purge_after_transfer.sql') return;
    const { captain, player } = await createCaptainWithPlayer(probe);
    const unrelated = await createUser(probe, 'player');
    await probe.query(`insert into exercises(id,owner_id,name_en,body_part) values($1,$2,'Old lift','back')`, [id(90), captain]);
    await probe.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
      values($1,$2,'2026-11-02',now(),now())`, [id(91), player]);
    await probe.query(`insert into set_logs(id,session_id,player_id,exercise_id,set_index,completed_at,client_updated_at)
      values($1,$2,$3,$4,0,now(),now())`, [id(92), id(91), player, id(90)]);
    await probe.query(`update profiles set deletion_requested_at=now()-interval '8 days' where id=any($1::uuid[])`, [[captain, unrelated]]);
    await expect(probe.query('select public.purge_deleted_accounts()'))
      .rejects.toMatchObject({ code: '23503', constraint: 'set_logs_exercise_id_fkey' });
    expect((await probe.query('select id from auth.users where id=any($1::uuid[])', [[captain, unrelated]])).rows).toHaveLength(2);
  });
  await baseline.close();
});

it('inventories every non-cascading library reference in the full migration chain', async () => {
  const { rows } = await db.query<{ reference: string }>(`select conrelid::regclass::text || '.' || a.attname as reference
    from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f' and confrelid in ('exercises'::regclass,'foods'::regclass)
      and confdeltype not in ('c','n') order by 1`);
  expect(rows.map(row => row.reference)).toEqual([
    'exercise_swap_requests.from_exercise_id', 'exercise_swap_requests.to_exercise_id',
    'form_checks.exercise_id', 'meal_item_alternatives.food_id', 'meal_items.food_id',
    'pain_reports.swap_original_id', 'pain_reports.swap_to_id',
    'program_exercises.exercise_id', 'set_logs.exercise_id',
  ]);
});

it('purges both overdue accounts, retaining transferred history and copied library references privately', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const next = await createUser(db, 'captain');
  const unrelated = await createUser(db, 'player');
  await db.query(`insert into exercises(id,owner_id,name_en,body_part) values
    ($1,$3,'Retained lift','back'),($2,$3,'Unused lift','back')`, [id(1), id(2), captain]);
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
    values($1,$2,'2026-11-02',now(),now())`, [id(3), player]);
  await db.query(`insert into set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    values($1,$2,$3,$4,0,60,8,now(),now())`, [id(4), id(3), player, id(1)]);
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [player]);
  await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,'2026-12-31')`, [next, player]);
  await db.query(`insert into programs(id,captain_id,player_id,title) values($1,$2,$3,'Copied plan')`, [id(5), next, player]);
  await db.query('insert into program_days(id,program_id,position) values($1,$2,0)', [id(6), id(5)]);
  await db.query(`insert into program_exercises(id,day_id,exercise_id,position,sets,reps_min)
    values($1,$2,$3,0,3,8)`, [id(7), id(6), id(1)]);
  await db.query(`insert into foods(id,owner_id,name_ar,name_en,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
    values($1,$3,'Food','Retained food',100,10,10,2),($2,$3,'Unused','Unused food',100,10,10,2)`, [id(8), id(9), captain]);
  await db.query(`insert into foods(id,name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
    values($1,'Catalog',100,10,10,2)`, [id(14)]);
  await db.query('update foods set replaces_id=$1 where id=$2', [id(14), id(8)]);
  await db.query(`insert into foods(id,owner_id,name_ar,name_en,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
    values($1,$2,'Alternative','Alternative food',100,10,10,2)`, [id(15), captain]);
  await db.query(`insert into nutrition_plans(id,captain_id,player_id,title) values($1,$2,$3,'Copied meals')`, [id(10), next, player]);
  await db.query(`insert into meals(id,plan_id,position,name) values($1,$2,0,'Lunch')`, [id(11), id(10)]);
  await db.query(`insert into meal_items(id,meal_id,food_id,grams,position) values($1,$2,$3,100,0)`, [id(12), id(11), id(8)]);
  await db.query(`insert into meal_item_alternatives(meal_item_id,food_id,grams) values($1,$2,100)`, [id(12), id(15)]);
  await db.query(`update profiles set deletion_requested_at=now()-interval '8 days' where id=any($1::uuid[])`, [[captain, unrelated]]);
  expect((await db.query('select public.purge_deleted_accounts() n')).rows).toEqual([{ n: 2 }]);
  expect((await db.query('select id from auth.users where id=any($1::uuid[])', [[captain, unrelated]])).rows).toEqual([]);
  expect((await asUser(db, player, tx => tx.query(`select e.name_en,s.weight_kg,s.reps from set_logs s
    join exercises e on e.id=s.exercise_id where s.id=$1`, [id(4)]))).rows)
    .toEqual([{ name_en: 'Retained lift', weight_kg: '60.00', reps: 8 }]);
  for (const table of ['exercises', 'foods']) {
    const retained = table === 'exercises' ? id(1) : id(8);
    expect((await db.query(`select owner_id,orphaned_at is not null as orphaned,archived_at is not null as archived
      from ${table} where id=$1`, [retained])).rows).toEqual([{ owner_id: null, orphaned: true, archived: true }]);
    const outsider = await createUser(db, 'player');
    for (const user of [next, outsider]) {
      expect((await asUser(db, user, tx => tx.query(`select id from ${table} where id=$1`, [retained]))).rows).toEqual([]);
    }
    expect((await asUser(db, player, tx => tx.query(`select id from ${table}
      where owner_id is null and archived_at is null and name_en ilike '%Retained%'`))).rows).toEqual([]);
    expect((await db.query(`select id from ${table} where id=$1`, [table === 'exercises' ? id(2) : id(9)])).rows).toEqual([]);
  }
  expect((await db.query('select id from program_exercises where id=$1', [id(7)])).rows).toHaveLength(1);
  expect((await db.query('select id from meal_item_alternatives where food_id=$1', [id(15)])).rows).toHaveLength(1);
  expect((await asUser(db, player, tx => tx.query('select name_en from foods where id=any($1::uuid[]) order by id',
    [[id(8), id(15)]]))).rows).toEqual([{ name_en: 'Retained food' }, { name_en: 'Alternative food' }]);
  expect((await asUser(db, next, tx => tx.query('select id from foods where id=$1', [id(15)]))).rows).toEqual([]);
});

it('keeps a program-only exercise readable by its player, including without an active subscription', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const next = await createUser(db, 'captain');
  await db.query(`insert into exercises(id,owner_id,name_en,body_part) values($1,$2,'Program-only lift','back')`, [id(30), captain]);
  await db.query(`insert into programs(id,captain_id,player_id,title) values($1,$2,$3,'Copied plan')`, [id(31), next, player]);
  await db.query('insert into program_days(id,program_id,position) values($1,$2,0)', [id(32), id(31)]);
  await db.query(`insert into program_exercises(id,day_id,exercise_id,position,sets,reps_min)
    values($1,$2,$3,0,3,8)`, [id(33), id(32), id(30)]);
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [player]);
  await db.query(`update profiles set deletion_requested_at=now()-interval '8 days' where id=$1`, [captain]);
  expect((await db.query('select public.purge_deleted_accounts() n')).rows).toEqual([{ n: 1 }]);
  expect((await asUser(db, player, tx => tx.query('select name_en from exercises where id=$1', [id(30)]))).rows)
    .toEqual([{ name_en: 'Program-only lift' }]);
  expect((await asUser(db, next, tx => tx.query('select id from exercises where id=$1', [id(30)]))).rows).toEqual([]);
});

it('retains copied alternatives even when no foreign key points at the exercise', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const next = await createUser(db, 'captain');
  await db.query(`insert into exercises(id,owner_id,name_en,body_part) values
    ($1,$3,'Alternative lift','back'),($2,null,'Global lift','back')`, [id(40), id(41), captain]);
  await db.query(`insert into programs(id,captain_id,player_id,title) values($1,$2,$3,'Plan')`, [id(42), captain, player]);
  await db.query('insert into program_days(id,program_id,position) values($1,$2,0)', [id(43), id(42)]);
  await db.query(`insert into program_exercises(id,day_id,exercise_id,position,sets,reps_min,alternatives)
    values($1,$2,$3,0,3,8,array[$4::uuid])`, [id(44), id(43), id(41), id(40)]);
  // Represents a copied program graph retaining its original alternative IDs.
  await db.query('update programs set captain_id=$1 where id=$2', [next, id(42)]);
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [player]);
  await db.query(`update profiles set deletion_requested_at=now()-interval '8 days' where id=$1`, [captain]);
  expect((await db.query('select public.purge_deleted_accounts() n')).rows).toEqual([{ n: 1 }]);
  expect((await asUser(db, player, tx => tx.query('select name_en from exercises where id=$1', [id(40)]))).rows)
    .toEqual([{ name_en: 'Alternative lift' }]);
  expect((await asUser(db, next, tx => tx.query('select id from exercises where id=$1', [id(40)]))).rows).toEqual([]);
});
