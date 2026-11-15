import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string, player: string, other: string;
const plan = '30400000-0000-4000-8000-000000000001';
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = (await createCaptainWithPlayer(db)).captain;
  await db.query(`insert into public.nutrition_plans (id,captain_id,player_id,title)
    values ($1,$2,$3,'Water')`, [plan, captain, player]);
});
afterAll(async () => { await db?.close(); });

it.each([499, 10001])('rejects target %s', async target => {
  await expect(asUser(db, captain, tx => tx.query(
    'update public.nutrition_plans set water_target_ml=$1 where id=$2', [target, plan])))
    .rejects.toThrow(/check constraint/);
});
it('allows the owner, but neither another captain nor the player can change it', async () => {
  for (const target of [500, 10000, null, 2750]) {
    await asUser(db, captain, tx => tx.query('update public.nutrition_plans set water_target_ml=$1 where id=$2', [target, plan]));
  }
  for (const user of [other, player]) {
    const result = await asUser(db, user, tx => tx.query('update public.nutrition_plans set water_target_ml=4000 where id=$1 returning id', [plan]));
    expect(result.rows).toEqual([]);
  }
  expect((await db.query('select water_target_ml from public.nutrition_plans where id=$1', [plan])).rows).toEqual([{ water_target_ml: 2750 }]);
});
it.each([3250, null])('copies target %s through all three functions', async target => {
  await db.query('update public.nutrition_plans set water_target_ml=$1 where id=$2', [target, plan]);
  await db.query("insert into public.meals (plan_id,position,name) select $1,1,'Meal' where not exists (select 1 from public.meals where plan_id=$1)", [plan]);
  const run = async (sql: string, args: (string | undefined)[]) => {
    const result = await asUser(db, captain, tx => tx.query<{ id: string }>(sql, args));
    const copy = result.rows[0]?.id;
    expect((await db.query('select water_target_ml from public.nutrition_plans where id=$1', [copy])).rows).toEqual([{ water_target_ml: target }]);
    return copy;
  };
  const template = await run('select public.nutrition_plan_to_template($1,$2) as id', [plan, 'Template']);
  await run("select public.copy_template('nutrition',$1,$2) as id", [template, 'Copy']);
  await run('select public.assign_nutrition_template($1,$2) as id', [template, player]);
});
it('saves and clears water in the same RPC as macros', async () => {
  for (const waterTargetMl of [3500, null]) {
    await asUser(db, captain, tx => tx.query('select public.save_nutrition_plan($1,$2::jsonb)', [plan,
      JSON.stringify({ title: 'Water', targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 }, meals: [], waterTargetMl })]));
    expect((await db.query('select water_target_ml from public.nutrition_plans where id=$1', [plan])).rows).toEqual([{ water_target_ml: waterTargetMl }]);
  }
});
