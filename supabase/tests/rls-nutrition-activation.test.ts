import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let other: string;
const id = (n: number) => `01900000-0000-7000-8000-${String(n).padStart(12, '0')}`;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  for (const n of [1, 2, 3, 4]) {
    await db.query(`insert into public.nutrition_plans (id, captain_id, player_id, is_template, title)
      values ($1, $2, $3, $4, 'نظام')`, [id(n), captain, n === 4 ? null : player, n === 4]);
  }
  await db.query(`insert into public.foods (id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    values ($1, 'رز', 100, 2, 20, 1)`, [id(10)]);
  for (const n of [1, 2]) {
    await db.query(`insert into public.meals (id, plan_id, position, name) values ($1, $2, 1, 'فطار')`, [id(n + 10), id(n)]);
    await db.query(`insert into public.meal_items (meal_id, food_id, grams, position) values ($1, $2, 100, 1)`, [id(n + 10), id(10)]);
  }
});
afterAll(async () => { await db.close(); });
const activate = (user: string, plan: number) => asUser(db, user, tx => tx.query('select public.activate_nutrition_plan($1)', [id(plan)]));
it('activation archives the previous plan and keeps one active per player', async () => {
  await activate(captain, 1);
  await activate(captain, 2);
  expect((await db.query('select status from public.nutrition_plans where id = $1', [id(1)])).rows).toEqual([{ status: 'archived' }]);
  expect((await db.query("select id from public.nutrition_plans where status = 'active'")).rows).toEqual([{ id: id(2) }]);
  await expect(db.query("update public.nutrition_plans set status = 'active' where id = $1", [id(1)])).rejects.toMatchObject({ code: '23505' });
});
it('another captain gets 42501', async () => {
  await expect(activate(other, 1)).rejects.toMatchObject({ code: '42501' });
});
it('templates and empty plans get 22023', async () => {
  for (const n of [3, 4]) await expect(activate(captain, n)).rejects.toMatchObject({ code: '22023' });
  await db.query(`insert into public.meals (plan_id, name, position) values ($1, 'فطار', 1)`, [id(3)]);
  await expect(activate(captain, 3)).rejects.toMatchObject({ code: '22023' });
});
it('anon has no execute', async () => {
  const result = await db.query<{ allowed: boolean }>("select has_function_privilege('anon', 'public.activate_nutrition_plan(uuid)', 'execute') as allowed");
  expect(result.rows).toEqual([{ allowed: false }]);
});
it('saves the hierarchy atomically and rejects another captain', async () => {
  const draft = { title: 'متعدل', targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 },
    meals: [{ id: id(11), name: 'فطار', items: [{ id: id(21), food: { id: id(10) }, grams: 150,
      alternatives: [{ id: id(31), food: { id: id(10) }, grams: 150 }] }] }] };
  const save = (user: string, value: unknown) => asUser(db, user, tx => tx.query('select public.save_nutrition_plan($1, $2)', [id(1), JSON.stringify(value)]));
  await expect(save(other, draft)).rejects.toMatchObject({ code: '42501' });
  await save(captain, draft);
  expect((await db.query('select grams from public.meal_items where id = $1', [id(21)])).rows).toEqual([{ grams: '150.0' }]);
  const invalid = { ...draft, title: 'فشل', meals: [{ ...draft.meals[0], name: '' }] };
  await expect(save(captain, invalid)).rejects.toThrow();
  expect((await db.query('select title from public.nutrition_plans where id = $1', [id(1)])).rows).toEqual([{ title: 'متعدل' }]);
  expect((await db.query('select grams from public.meal_items where id = $1', [id(21)])).rows).toHaveLength(1);
  expect((await db.query("select has_function_privilege('anon', 'public.save_nutrition_plan(uuid,jsonb)', 'execute') as allowed")).rows).toEqual([{ allowed: false }]);
});
it('saving an existing meal preserves its player log reference', async () => {
  await db.query(`insert into public.meal_logs (id, player_id, meal_id, log_date, client_updated_at)
    values ($1, $2, $3, '2026-11-03', '2026-11-03T08:00:00Z')`, [id(40), player, id(12)]);
  const draft = { title: 'نظام', targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 },
    meals: [{ id: id(12), name: 'غدا', items: [{ id: id(22), food: { id: id(10) }, grams: 100, alternatives: [] }] }] };
  await asUser(db, captain, tx => tx.query('select public.save_nutrition_plan($1, $2)', [id(2), JSON.stringify(draft)]));
  expect((await db.query('select meal_id from public.meal_logs where id = $1', [id(40)])).rows).toEqual([{ meal_id: id(12) }]);
});
