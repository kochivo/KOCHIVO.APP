import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let sequence = 0;
const id = () => `01900000-0000-7000-8000-${String(++sequence).padStart(12, '0')}`;
const NOW = '2026-11-03T08:00:00Z';
const LATER = '2026-11-03T09:00:00Z';
const TABLES = ['programs', 'program_days', 'program_exercises', 'nutrition_plans',
  'meals', 'meal_items', 'meal_item_alternatives'] as const;

beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });

async function content(captain: string, player: string) {
  const ids = TABLES.map(() => id());
  const [program, day, item, plan, meal, foodItem, alt] = ids;
  const exercise = id();
  const food = id();
  await db.query(`insert into public.exercises (id, name_en, body_part) values ($1, 'Squat', 'legs')`, [exercise]);
  await db.query(`insert into public.foods
    (id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    values ($1, 'Food', 100, 10, 10, 2)`, [food]);
  await asUser(db, captain, async (tx) => {
    await tx.query(`insert into public.programs (id, captain_id, player_id, title, status)
      values ($1, $2, $3, 'Program', 'active')`, [program, captain, player]);
    await tx.query(`insert into public.program_days (id, program_id, position) values ($1, $2, 0)`, [day, program]);
    await tx.query(`insert into public.program_exercises (id, day_id, exercise_id, position, sets, reps_min)
      values ($1, $2, $3, 0, 3, 8)`, [item, day, exercise]);
    await tx.query(`insert into public.nutrition_plans (id, captain_id, player_id, title, status)
      values ($1, $2, $3, 'Plan', 'active')`, [plan, captain, player]);
    await tx.query(`insert into public.meals (id, plan_id, position, name) values ($1, $2, 0, 'Meal')`, [meal, plan]);
    await tx.query(`insert into public.meal_items (id, meal_id, food_id, grams, position)
      values ($1, $2, $3, 100, 0)`, [foodItem, meal, food]);
    await tx.query(`insert into public.meal_item_alternatives (id, meal_item_id, food_id, grams)
      values ($1, $2, $3, 150)`, [alt, foodItem, food]);
  });
  return { ids, program, day, item, plan, meal, exercise };
}

async function visible(user: string, f: Awaited<ReturnType<typeof content>>, allowed: boolean) {
  await asUser(db, user, async (tx) => {
    for (const [index, table] of TABLES.entries()) {
      const { rows } = await tx.query(`select id from public.${table} where id = $1`, [f.ids[index]]);
      expect(rows, table).toEqual(allowed ? [{ id: f.ids[index] }] : []);
    }
    const { rows } = await tx.query(`select public.can_read_program($1) as program,
      public.can_read_plan($2) as plan`, [f.program, f.plan]);
    expect(rows).toEqual([{ program: allowed, plan: allowed }]);
  });
}

async function history(player: string, f: Awaited<ReturnType<typeof content>>, timestamp: string, ids = [id(), id(), id()]) {
  const [session, set, meal] = ids;
  await asUser(db, player, async (tx) => {
    await tx.query('select public.sync_workout_sessions($1)', [JSON.stringify([{
      id: session, program_day_id: f.day, training_date: '2026-11-03', started_at: NOW,
      completed_at: timestamp, client_updated_at: timestamp,
    }])]);
    await tx.query('select public.sync_set_logs($1)', [JSON.stringify([{
      id: set, session_id: session, program_exercise_id: f.item, exercise_id: f.exercise,
      set_index: 0, weight_kg: 50, reps: 8, completed_at: timestamp, client_updated_at: timestamp,
    }])]);
    await tx.query('select public.sync_meal_logs($1)', [JSON.stringify([{
      id: meal, meal_id: f.meal, log_date: '2026-11-03', completed_at: timestamp, client_updated_at: timestamp,
    }])]);
    for (const [index, table] of ['workout_sessions', 'set_logs', 'meal_logs'].entries()) {
      const { rows } = await tx.query<{ player_id: string; updated: string }>(
        `select player_id, client_updated_at::text as updated from public.${table} where id = $1`, [ids[index]],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.player_id).toBe(player);
      expect(Date.parse(rows[0]?.updated ?? '')).toBe(Date.parse(timestamp));
    }
  });
  return ids;
}

describe('content access belongs to its captain (0027)', () => {
  it.each([30, -1, -3, -4])('isolates a transfer with A access_until offset %i', async (offset) => {
    const { captain: a, player } = await createCaptainWithPlayer(db);
    const b = await createUser(db, 'captain');
    const f = await content(a, player);
    const logs = await history(player, f, NOW);
    await asUser(db, a, (tx) => tx.query(`update public.coach_clients
      set access_until = current_date + $1::int where player_id = $2`, [offset, player]));
    await visible(player, f, offset >= -3);
    await asUser(db, a, (tx) => tx.query(`update public.coach_clients
      set archived_at = now() where player_id = $1`, [player]));
    const { rows } = await asUser(db, b, (tx) => tx.query<{ code: string }>(
      `insert into public.coach_invites (captain_id, access_until)
       values ($1, current_date + 30) returning code`, [b],
    ));
    await asUser(db, player, (tx) => tx.query('select public.redeem_invite($1)', [rows[0]?.code]));
    // Keep A active for the regression assertion; activating B first would mask SEC-02.
    await visible(player, f, false);
    await visible(a, f, true);
    await history(player, f, LATER, logs);
    // Owner fixture setup frees the unique active slots; A cannot update after transfer.
    await db.query(`update public.programs set status = 'archived' where id = $1`, [f.program]);
    await db.query(`update public.nutrition_plans set status = 'archived' where id = $1`, [f.plan]);
    const current = await content(b, player);
    await visible(player, current, true);
    await visible(a, current, false);
    await history(player, current, NOW);
  });

  it('does not authorize an unrelated player through the same captain', async () => {
    const { captain, player } = await createCaptainWithPlayer(db);
    const stranger = await createUser(db, 'player');
    await db.query(`insert into public.coach_clients (captain_id, player_id, access_until)
      values ($1, $2, current_date + 30)`, [captain, stranger]);
    await visible(stranger, await content(captain, player), false);
  });

  it('restricts helper execution to authenticated callers', async () => {
    const { rows } = await db.query(`select
      has_function_privilege('anon', 'public.player_can_read_from(uuid)', 'execute') as anon,
      has_function_privilege('authenticated', 'public.player_can_read_from(uuid)', 'execute') as authenticated`);
    expect(rows).toEqual([{ anon: false, authenticated: true }]);
  });
});
