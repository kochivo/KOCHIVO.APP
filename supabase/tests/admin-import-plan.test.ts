import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let admin: string;
let captain: string;
let other: string;
let player: string;
const id = '019ab901-1000-7000-8000-000000000001';
const day = '019ab901-1000-7000-8000-000000000002';
const exercise = '019ab901-1000-7000-8000-000000000003';
const catalog = '019ab901-1000-7000-8000-000000000004';
const nutritionId = '019ab901-1000-7000-8000-000000000005';
const training = { days: [{ id: day, name: 'Torso A', exercises: [{
  id: exercise, exerciseId: catalog, name: 'Press', bodyPart: 'chest', sets: 2, repsMin: 8,
  repsMax: 10, rest: 90, note: '', setPlan: [{ reps_min: 8, reps_max: 10, rir: 2 }, { reps_min: 8, reps_max: 10, rir: 0 }],
}] }] };
const nutrition = { targets: { kcal: 3606, protein: 286, carbs: 379, fat: 95 }, water: null, meals: [{
  id: day, name: 'Breakfast', items: [{ id: exercise, foodId: catalog, name: 'Milk', grams: 412,
    unit: 'ml', units: [{ key: 'ml', name_ar: 'مل', name_en: 'ml', grams: 1.03 }],
    kcal: 33.5, protein: 3.2, carbs: 4.4, fat: 0.4 }],
}] };

beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, 'captain', 'Operator');
  captain = await createUser(db, 'captain', 'Recipient');
  other = await createUser(db, 'captain', 'Another coach');
  player = await createUser(db, 'player');
  await makeAdmin(db, admin);
});
afterAll(async () => { await db?.close(); });

function run(actor: string, target: string, kind: string, planId: string, payload: object) {
  return asUser(db, actor, tx => tx.query('select public.admin_import_plan($1,$2,$3,$4,$5)',
    [planId, target, kind, 'Abdallah', JSON.stringify({ ...payload,
      fingerprint: createHash('sha256').update(JSON.stringify(payload)).digest('hex') })]));
}

it('requires active administration and rejects a player destination', async () => {
  await expect(run(other, captain, 'training', id, training)).rejects.toMatchObject({ code: '42501' });
  await expect(run(admin, player, 'training', id, training)).rejects.toMatchObject({ code: '22023' });
});

it('exposes invoker entrypoints while keeping elevated work in the private schema', async () => {
  expect((await db.query(`select proname, prosecdef from pg_proc where pronamespace = 'public'::regnamespace
    and proname in ('admin_import_plan', 'admin_find_import_captain') order by proname`)).rows).toEqual([
    { proname: 'admin_find_import_captain', prosecdef: false },
    { proname: 'admin_import_plan', prosecdef: false },
  ]);
  await expect(asUser(db, admin, tx => tx.query(
    "select * from security_private.admin_find_import_captain('import-coach@example.test')",
  ))).rejects.toMatchObject({ code: '42501' });
});

it('looks up an approved coach by exact email only for administrators', async () => {
  await db.query("update auth.users set email = 'import-coach@example.test' where id = $1", [captain]);
  const find = (actor: string, email: string) => asUser(db, actor, tx => tx.query(
    'select id, email from public.admin_find_import_captain($1)', [email]));
  await expect(find(other, 'import-coach@example.test')).rejects.toMatchObject({ code: '42501' });
  expect((await find(admin, 'IMPORT-COACH@example.test')).rows).toEqual([{ id: captain, email: 'import-coach@example.test' }]);
  expect((await find(admin, 'import-coach')).rows).toEqual([]);
  await expect(asUser(db, admin, tx => tx.query("select * from public.admin_find_import_captain('import-coach@example.test')"), true))
    .rejects.toMatchObject({ code: '42501' });
});

it('creates an unassigned training template and records only one audit entry on retry', async () => {
  await run(admin, captain, 'training', id, training);
  await run(admin, captain, 'training', id, training);
  await expect(run(admin, captain, 'training', id, { ...training, notes: 'changed' })).rejects.toMatchObject({ code: '22023' });
  const template = await asUser(db, captain, tx => tx.query('select player_id, is_template, status from public.programs where id = $1', [id]));
  expect(template.rows).toEqual([{ player_id: null, is_template: true, status: 'draft' }]);
  expect((await asUser(db, other, tx => tx.query('select id from public.programs where id = $1', [id]))).rows).toEqual([]);
  expect((await db.query('select target_id, action from public.admin_audit_log where id = $1', [id])).rows)
    .toEqual([{ target_id: captain, action: 'import_template' }]);
});

it('keeps the food library entry private and saves its original portion unit', async () => {
  await run(admin, captain, 'nutrition', nutritionId, nutrition);
  const rows = await asUser(db, captain, tx => tx.query(`
    select p.player_id, p.target_kcal, i.unit, f.owner_id
    from public.nutrition_plans p join public.meals m on m.plan_id = p.id
      join public.meal_items i on i.meal_id = m.id join public.foods f on f.id = i.food_id
    where p.id = $1`, [nutritionId]));
  expect(rows.rows).toEqual([{ player_id: null, target_kcal: 3606, unit: 'ml', owner_id: captain }]);
});

it('rolls back the import when a meal item fails', async () => {
  const failed = '019ab901-1000-7000-8000-000000000006';
  const payload = { meals: [{ id: failed, name: 'Invalid', items: [{
    id: failed, foodId: failed, name: 'Broken', grams: -100, units: [], kcal: 100, protein: 4, carbs: 8, fat: 1,
  }] }] };
  await expect(run(admin, captain, 'nutrition', failed, payload)).rejects.toMatchObject({ code: '22023' });
  expect((await db.query('select id from public.nutrition_plans where id = $1', [failed])).rows).toEqual([]);
  expect((await db.query('select id from public.foods where id = $1', [failed])).rows).toEqual([]);
});

it('can assign imported templates once the coach adds the player', async () => {
  await db.query(
    "insert into public.coach_clients (captain_id, player_id, access_until) values ($1, $2, now() + interval '1 day')",
    [captain, player],
  );
  const assignedTraining = await asUser(db, captain, tx => tx.query(`
    with result as materialized (select public.assign_program_template($1,$2) as id)
    select id from result`, [id, player]));
  const assignedNutrition = await asUser(db, captain, tx => tx.query('select public.assign_nutrition_template($1,$2) as id',
    [nutritionId, player]));
  expect(assignedTraining.rows[0]).toMatchObject({ id: expect.any(String) });
  expect(assignedNutrition.rows[0]).toMatchObject({ id: expect.any(String) });
  const target = await db.query(`select e.set_plan
    from public.programs p join public.program_days d on d.program_id = p.id
    join public.program_exercises e on e.day_id = d.id where p.player_id = $1 and p.source_template_id = $2`, [player, id]);
  expect(target.rows).toEqual([{ set_plan: [{ reps_min: 8, reps_max: 10, rir: 2 }, { reps_min: 8, reps_max: 10, rir: 0 }] }]);
});
