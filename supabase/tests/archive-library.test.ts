import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let other: string;
let exercise: string;
let food: string;
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
async function id(sql: string, params: unknown[]) {
  const result = await db.query<{ id: string }>(`${sql} returning id`, params);
  const row = result.rows[0];
  if (!row) throw new Error('Fixture returned no id');
  return row.id;
}
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  exercise = await id(`insert into public.exercises (owner_id,name_en,body_part) values ($1,'Press','chest')`, [captain]);
  food = await id(`insert into public.foods (owner_id,name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,photo_path)
    values ($1::uuid,'Soup',100,5,10,2,'captain-food-photos/' || $1::uuid::text || '/soup.jpg')`, [captain]);
  const program = await id(`insert into public.programs (captain_id,player_id,title,status) values ($1,$2,'Plan','active')`, [captain, player]);
  const day = await id(`insert into public.program_days (program_id,position) values ($1,0)`, [program]);
  await db.query(`insert into public.program_exercises (day_id,exercise_id,position,sets,reps_min) values ($1,$2,0,3,8)`, [day, exercise]);
  const plan = await id(`insert into public.nutrition_plans (captain_id,player_id,title,status) values ($1,$2,'Meals','active')`, [captain, player]);
  const meal = await id(`insert into public.meals (plan_id,name,position) values ($1,'Lunch',0)`, [plan]);
  await db.query(`insert into public.meal_items (meal_id,food_id,grams,position) values ($1,$2,100,0)`, [meal, food]);
});
afterAll(async () => { await db?.close(); });

it.each(['exercises', 'foods'] as const)('only the owner can archive referenced %s; plan reads survive', async table => {
  const item = table === 'exercises' ? exercise : food;
  for (const user of [other, player]) {
    expect((await run(user, `update public.${table} set archived_at=$2 where id=$1 returning id`, [item, TEST_NOW])).rows).toEqual([]);
  }
  await expect(run(captain, `delete from public.${table} where id=$1`, [item])).rejects.toMatchObject({ code: '23503' });
  expect((await run(captain, `update public.${table} set archived_at=$2 where id=$1 returning id`, [item, TEST_NOW])).rows).toEqual([{ id: item }]);
  for (const user of [captain, player]) {
    const join = table === 'exercises'
      ? 'public.program_exercises p join public.exercises i on i.id=p.exercise_id'
      : 'public.meal_items p join public.foods i on i.id=p.food_id';
    expect((await run(user, `select i.id from ${join} where i.id=$1 and i.archived_at is not null`, [item])).rows).toEqual([{ id: item }]);
    expect((await run(user, `select id from public.${table} where id=$1 and archived_at is null`, [item])).rows).toEqual([]);
  }
  if (table === 'foods') {
    expect((await run(player, 'select photo_path from public.foods where id=$1', [item])).rows)
      .toEqual([{ photo_path: `captain-food-photos/${captain}/soup.jpg` }]);
  }
});
it.each(['exercises', 'foods'] as const)('still hard deletes unused %s', async table => {
  const item = table === 'exercises'
    ? await id(`insert into public.exercises (owner_id,name_en,body_part) values ($1,'Unused','chest')`, [captain])
    : await id(`insert into public.foods (owner_id,name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
        values ($1,'Unused',100,5,10,2)`, [captain]);
  expect((await run(captain, `delete from public.${table} where id=$1 returning id`, [item])).rows).toEqual([{ id: item }]);
  expect((await db.query(`select id from public.${table} where id=$1`, [item])).rows).toEqual([]);
});
