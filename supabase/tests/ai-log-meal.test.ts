import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { stableId } from '../../src/core/offline/ids';
import { asUser, createCaptainWithPlayer, createTestDb, TEST_NOW } from './harness';

let db: PGlite;
let player: string;
let otherPlayer: string;
const meals = [
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
] as const;
const foreignMeal = '44444444-4444-4444-8444-444444444444';
const item = '55555555-5555-4555-8555-555555555555';
const alternative = '66666666-6666-4666-8666-666666666666';
const today = '2026-11-03';
const yesterday = '2026-11-02';
const macros = { kcal: 120, protein: 10, carbs: 20, fat: 0 };
const query = 'select public.ai_log_meal($1,$2,$3,$4,$5)';

beforeAll(async () => {
  db = await createTestDb();
  const own = await createCaptainWithPlayer(db);
  const other = await createCaptainWithPlayer(db);
  player = own.player;
  otherPlayer = other.player;
  await db.query('update public.profiles set role_confirmed=true where id in ($1,$2)', [player, otherPlayer]);
  const seed = `with plan as (
    insert into public.nutrition_plans(captain_id,player_id,title,status)
    values ($1,$2,'Plan','active') returning id
  )
  insert into public.meals(id,plan_id,position,name)
  select meal_id,plan.id,position,'Lunch' from plan,unnest($3::uuid[]) with ordinality as meal(meal_id,position)`;
  await db.query(seed, [own.captain, player, meals]);
  await db.query(seed, [other.captain, otherPlayer, [foreignMeal]]);
  await db.query(`with food as (
    insert into public.foods(name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
    values ('Rice',120,10,20,0) returning id
  ), meal_item as (
    insert into public.meal_items(id,meal_id,food_id,grams,position)
    select $1,$2,food.id,100,1 from food returning id
  )
  insert into public.meal_item_alternatives(id,meal_item_id,food_id,grams)
  select $3,meal_item.id,food.id,100 from meal_item,food`, [item, meals[0], alternative]);
});

afterAll(async () => { await db?.close(); });

function logMeal(mealId: string, day: string, swaps = {}, user = player) {
  return asUser(db, user, tx => tx.query(query, [mealId, day, swaps, true, macros]));
}

it.each([[meals[0], today], [meals[1], yesterday], [meals[2], today]])(
  'writes the same stable ID as the app for meal %s on %s', async (mealId, date) => {
    const expectedId = await stableId('meal', mealId, date);
    await logMeal(mealId, date);
    const { rows } = await db.query('select id, eaten_macros from public.meal_logs where meal_id=$1 and log_date=$2', [mealId, date]);
    expect(rows).toEqual([{ id: expectedId, eaten_macros: macros }]);
  },
);

it('rejects a meal belonging to another player', async () => {
  await expect(logMeal(foreignMeal, today)).rejects.toMatchObject({ code: '42501' });
});

it.each(['2026-11-01', '2026-11-04'])('rejects %s in the player time zone', async date => {
  await expect(logMeal(meals[0], date)).rejects.toMatchObject({ code: '22023' });
});

it('rejects an alternative that does not belong to the item', async () => {
  await expect(logMeal(meals[0], today, { [item]: meals[1] })).rejects.toMatchObject({ code: '22023' });
});

it('uses the player timezone across the UTC date boundary', async () => {
  await db.query("update public.profiles set timezone='Pacific/Pago_Pago' where id=$1", [otherPlayer]);
  await expect(logMeal(foreignMeal, today, {}, otherPlayer)).rejects.toMatchObject({ code: '22023' });
  await expect(logMeal(foreignMeal, yesterday, {}, otherPlayer)).resolves.toBeDefined();
});

it('rejects a suspended player', async () => {
  await db.query('update public.profiles set suspended_at=now() where id=$1', [otherPlayer]);
  try {
    await expect(logMeal(foreignMeal, today, {}, otherPlayer)).rejects.toMatchObject({ code: '42501' });
  } finally {
    await db.query('update public.profiles set suspended_at=null where id=$1', [otherPlayer]);
  }
});

it('allows OAuth to log a meal and read the updated swaps through the gate', async () => {
  const swaps = { [item]: alternative };
  await asUser(db, player, async tx => {
    await tx.query(`select set_config('request.jwt.claims',$1,true),
      set_config('request.method','POST',true),set_config('request.path','/rpc/ai_log_meal',true)`,
    [JSON.stringify({ sub: player, role: 'authenticated', client_id: 'client' })]);
    await tx.query('select public.oauth_request_gate()');
    await tx.query(query, [meals[0], yesterday, swaps, true, macros]);
    await tx.query(`select set_config('request.method','GET',true), set_config('request.path','/meal_logs',true)`);
    await tx.query('select public.oauth_request_gate()');
    const { rows } = await tx.query('select swaps from public.meal_logs where meal_id=$1 and log_date=$2', [meals[0], yesterday]);
    expect(rows).toEqual([{ swaps }]);
  });
});

it('shares the offline row and keeps the latest client timestamp', async () => {
  const mealId = meals[1];
  const id = await stableId('meal', mealId, today);
  const sync = (client_updated_at: string) => asUser(db, player, tx =>
    tx.query('select public.sync_meal_logs($1)', [JSON.stringify([{
      id, meal_id: mealId, log_date: today, client_updated_at, completed_at: null,
    }])]));
  const read = () => db.query('select id, completed_at is not null as eaten from public.meal_logs where meal_id=$1 and log_date=$2', [mealId, today]);
  const older = '2026-11-03T09:59:00Z';
  await sync(older);
  await logMeal(mealId, today);
  await sync(older);
  expect((await read()).rows).toEqual([{ id, eaten: true }]);
  await sync(new Date(Date.parse(TEST_NOW) + 1000).toISOString());
  expect((await read()).rows).toEqual([{ id, eaten: false }]);
});
