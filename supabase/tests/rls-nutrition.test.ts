import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let otherCaptain: string;
let player: string;
const PLAN = '01900000-0000-8000-8000-000000000101';
const MEAL = '01900000-0000-8000-8000-000000000102';
const ITEM = '01900000-0000-8000-8000-000000000103';
const ALT = '01900000-0000-8000-8000-000000000104';
const FOOD = '01900000-0000-8000-8000-000000000105';
const GLOBAL = '01900000-0000-8000-8000-000000000106';
const LOG = '01900000-0000-8000-8000-000000000107';
const tables = ['nutrition_plans', 'meals', 'meal_items', 'meal_item_alternatives'] as const;
const ids = [PLAN, MEAL, ITEM, ALT];
const updates = ["title = 'Changed'", "name = 'Changed'", 'grams = 200', 'grams = 200'];

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  otherCaptain = await createUser(db, 'captain', 'B');
  const teammate = await createUser(db, 'player');
  await db.query(`insert into public.coach_clients (captain_id, player_id, access_until) values ($1, $2, current_date + 30)`, [captain, teammate]);
  await db.query(`insert into public.foods (id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    values ($1, 'أرز', 130, 3, 28, 0)`, [GLOBAL]);
  await asUser(db, captain, async (tx) => {
    await tx.query(`insert into public.foods (id, owner_id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
      values ($1, $2, 'فراخ', 165, 31, 0, 4)`, [FOOD, captain]);
    for (const [trainee, plan, meal, item, alt] of [
      [player, PLAN, MEAL, ITEM, ALT],
      [teammate, '01900000-0000-8000-8000-000000000111', '01900000-0000-8000-8000-000000000112',
        '01900000-0000-8000-8000-000000000113', '01900000-0000-8000-8000-000000000114'],
    ] as const) {
      await tx.query(`insert into public.nutrition_plans (id, captain_id, player_id, title, status)
        values ($1, $2, $3, 'خطة', 'active')`, [plan, captain, trainee]);
      await tx.query(`insert into public.meals (id, plan_id, position, name) values ($1, $2, 0, 'غدا')`, [meal, plan]);
      await tx.query(`insert into public.meal_items (id, meal_id, food_id, grams, position) values ($1, $2, $3, 100, 0)`, [item, meal, FOOD]);
      await tx.query(`insert into public.meal_item_alternatives (id, meal_item_id, food_id, grams) values ($1, $2, $3, 125)`, [alt, item, GLOBAL]);
    }
  });
});

afterAll(async () => { await db.close(); });

describe('nutrition isolation', () => {
  it('Another captain cannot read or update the assigned nutrition plan hierarchy.', async () => {
    await asUser(db, otherCaptain, async (tx) => {
      for (const [index, table] of tables.entries()) {
        expect((await tx.query(`select * from public.${table}`)).rows).toHaveLength(0);
        expect((await tx.query(`update public.${table} set ${updates[index]} where id = $1 returning id`, [ids[index]])).rows).toHaveLength(0);
      }
    });
    for (const [index, table] of tables.entries()) {
      expect((await db.query(`select id from public.${table} where id = $1`, [ids[index]])).rows).toEqual([{ id: ids[index] }]);
    }
  });

  it('A player can read their active nutrition plan hierarchy but cannot insert or update it.', async () => {
    await asUser(db, player, async (tx) => {
      for (const [index, table] of tables.entries()) {
        expect((await tx.query(`select id from public.${table}`)).rows).toEqual([{ id: ids[index] }]);
        expect((await tx.query(`update public.${table} set ${updates[index]} where id = $1 returning id`, [ids[index]])).rows).toHaveLength(0);
      }
    });
    const inserts = [
      { sql: `insert into public.nutrition_plans (captain_id, player_id, title, status) values ($1, $2, 'خطة', 'active')`, args: [captain, player] },
      { sql: `insert into public.meals (plan_id, position, name) values ($1, 1, 'عشا')`, args: [PLAN] },
      { sql: `insert into public.meal_items (meal_id, food_id, grams, position) values ($1, $2, 50, 1)`, args: [MEAL, FOOD] },
      { sql: `insert into public.meal_item_alternatives (meal_item_id, food_id, grams) values ($1, $2, 50)`, args: [ITEM, FOOD] },
    ];
    for (const { sql, args } of inserts) {
      await expect(asUser(db, player, (tx) => tx.query(sql, args))).rejects.toThrow(/row-level security/);
    }
  });

  it('An older meal log sync cannot overwrite a newer edit.', async () => {
    const sync = (updated: string, swaps: Record<string, string>) => asUser(db, player, (tx) => tx.query(
      `select public.sync_meal_logs($1)`, [JSON.stringify([{
        id: LOG, meal_id: MEAL, log_date: '2026-11-03', swaps,
        completed_at: updated, client_updated_at: updated, deleted_at: null,
      }])],
    ));
    await sync('2026-11-03T08:10:00Z', { [ITEM]: ALT });
    await sync('2026-11-03T08:05:00Z', {});
    const result = await asUser(db, player, (tx) => tx.query(
      `select player_id, meal_id, swaps, client_updated_at::text, completed_at::text from public.meal_logs where id = $1`, [LOG],
    ));
    expect(result.rows).toEqual([{
      player_id: player, meal_id: MEAL, swaps: { [ITEM]: ALT },
      client_updated_at: '2026-11-03 08:10:00+00', completed_at: '2026-11-03 08:10:00+00',
    }]);
  });

  it('A player cannot insert a meal log for another player’s meal.', async () => {
    const other = await createCaptainWithPlayer(db);
    expect((await asUser(db, other.player, (tx) => tx.query(`select id from public.meals where id = $1`, [MEAL]))).rows).toHaveLength(0);
    await expect(asUser(db, other.player, (tx) => tx.query(
      `insert into public.meal_logs (id, meal_id, log_date, client_updated_at) values ($1, $2, '2026-11-03', '2026-11-03T08:00:00Z')`,
      ['01900000-0000-8000-8000-000000000108', MEAL],
    ))).rejects.toThrow(/row-level security/);
  });

  it('Captain foods are visible only to their owner and players while global foods are visible to everyone.', async () => {
    const unlinkedPlayer = await createUser(db, 'player');
    for (const user of [captain, player, otherCaptain, unlinkedPlayer]) {
      const result = await asUser(db, user, (tx) => tx.query(`select id from public.foods order by id`));
      expect(result.rows).toEqual(user === captain || user === player ? [{ id: FOOD }, { id: GLOBAL }] : [{ id: GLOBAL }]);
    }
  });
});
