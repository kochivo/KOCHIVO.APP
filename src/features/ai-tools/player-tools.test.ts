import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { runTool } from './server';
import type { ToolContext } from './types';

vi.mock('server-only', () => ({}));

const player = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const meal = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const item = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const alternative = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const foreign = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const today = '2026-11-19';
const food = { name_ar: 'Rice', photo_path: 'private.jpg', kcal_per_100g: 100,
  protein_per_100g: 10, carbs_per_100g: 15, fat_per_100g: 1 };
const plan = {
  id: 'plan', title: 'Food plan', target_kcal: 2000, target_protein: 100, target_carbs: 250,
  target_fat: 60, water_target_ml: 2500, meals: [{
    id: meal, name: 'Lunch', position: 1, day_type: 'all', time_of_day: '12:30:00',
    meal_items: [{
      id: item, position: 1, grams: 100, unit: 'cup',
      foods: { ...food, units: [{ key: 'cup', grams: 50 }] },
      meal_item_alternatives: [{ id: alternative, grams: 200, foods: { ...food, name_ar: 'Pasta' } }],
    }],
  }],
};

function fixture({ rest = false, noPlan = false, rotating = false, role = 'player' }: {
  rest?: boolean; noPlan?: boolean; rotating?: boolean; role?: ToolContext['actor']['role'];
} = {}) {
  let logged: { meal_id: string; log_date: string; completed_at: string | null; swaps: unknown; eaten_macros: unknown }[] = [];
  const calls: { path: string; body: unknown }[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.split('/').at(-1) ?? '';
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    calls.push({ path, body });
    switch (path) {
      case 'ko_rate_take': return Response.json(true);
      case 'ai_audit_write': return new Response(null, { status: 204 });
      case 'nutrition_plans':
        return Response.json(url.searchParams.get('player_id') === `eq.${player}` && !noPlan ? [plan] : []);
      case 'programs':
        return Response.json(url.searchParams.get('player_id') === `eq.${player}` && !noPlan ? [{
          id: 'program', title: 'Training', settings: {}, program_days: [{
            id: 'day', title: 'Upper body', position: 1, weekday: rotating ? null : 5, is_rest_day: rest,
            program_exercises: [{ id: 'exercise', position: 1, sets: 2, reps_min: 8, reps_max: 10,
              rest_seconds: 90, exercises: { name_en: 'Press' } }],
          }, ...(rotating ? [{ id: 'day-2', title: 'Lower body', position: 2, program_exercises: [] }] : [])],
        }] : []);
      case 'ai_player_training_days': return Response.json([{ training_days: [rest ? 3 : 4] }]);
      case 'ai_player_workout_history': return Response.json(url.searchParams.get('training_date') === `lt.${today}` ? [{
        id: 'session', program_day_id: 'day', training_date: '2026-11-18', completed_at: '2026-11-18T09:00:00Z',
      }] : []);
      case 'meal_logs':
        return Response.json(url.searchParams.get('player_id') === `eq.${player}` &&
          url.searchParams.get('log_date') === `eq.${today}` ? logged : []);
      case 'ai_log_meal': {
        const args = body as { p_meal_id: string; p_eaten: boolean; p_swaps: unknown; p_eaten_macros: unknown };
        logged = [{ meal_id: args.p_meal_id, log_date: today, completed_at: args.p_eaten ? '2026-11-18T23:00:00Z' : null,
          swaps: args.p_swaps, eaten_macros: args.p_eaten_macros }];
        return new Response(null, { status: 204 });
      }
      default: return Response.json({ message: 'Unexpected request' }, { status: 400 });
    }
  });
  const ctx: ToolContext = {
    actor: { role, id: player, db: createClient<AppDatabase>('https://test.example', 'key', {
      global: { fetch }, auth: { persistSession: false },
    }) },
    now: new Date('2026-11-18T23:00:00Z'), timezone: 'Africa/Cairo', client: 'mcp:client',
    correlationId: foreign, signal: new AbortController().signal,
  };
  return { ctx, calls };
}

it('reads the caller’s plan with portions, macros, alternatives and targets', async () => {
  const { ctx } = fixture();
  const result = await runTool(ctx, 'get_my_nutrition_today', {});
  expect(result).toMatchObject({ ok: true, data: {
    title: plan.title, dayType: 'training', targets: { kcal: 2000, waterMl: 2500 },
    meals: [{ id: meal, name: 'Lunch', time: '12:30:00', eaten: false, swaps: {}, items: [{
      id: item, name: 'Rice', amount: 2, unit: 'cup', grams: 100, kcal: 100, protein: 10, carbs: 15, fat: 1,
      alternatives: [{ id: alternative, name: 'Pasta', amount: 200, unit: 'g', kcal: 200 }],
    }] }],
    eaten: { kcal: 0 }, remaining: { kcal: 2000 },
  } });
  expect(JSON.stringify(result)).not.toContain('private.jpg');
});

it('reads the caller’s workout in their local day', async () => {
  const { ctx } = fixture();
  expect(await runTool(ctx, 'get_my_workout_today', {})).toEqual({ ok: true, data: {
    title: 'Upper body', exercises: [{ name: 'Press', sets: 2, restSeconds: 90,
      reps: [{ min: 8, max: 10 }, { min: 8, max: 10 }] }],
  } });
});

it('advances rotating workouts using the caller’s completed sessions and training weekdays', async () => {
  const scheduled = fixture({ rotating: true });
  expect(await runTool(scheduled.ctx, 'get_my_workout_today', {})).toMatchObject({
    ok: true, data: { title: 'Lower body' },
  });
  const rest = fixture({ rotating: true, rest: true });
  expect(await runTool(rest.ctx, 'get_my_workout_today', {})).toEqual({ ok: true, data: null });
});

it('returns a rest-day nutrition menu and no workout on rest days', async () => {
  const { ctx } = fixture({ rest: true });
  expect(await runTool(ctx, 'get_my_workout_today', {})).toEqual({ ok: true, data: null });
  expect(await runTool(ctx, 'get_my_nutrition_today', {})).toMatchObject({ ok: true, data: { dayType: 'rest' } });
});

it.each(['get_my_workout_today', 'get_my_nutrition_today'])('returns null from %s without an active plan', async tool => {
  const { ctx } = fixture({ noPlan: true });
  expect(await runTool(ctx, tool, {})).toEqual({ ok: true, data: null });
});

it.each(['get_my_workout_today', 'get_my_nutrition_today', 'log_my_meal'])('forbids a captain from calling %s', async tool => {
  const { ctx, calls } = fixture({ role: 'captain' });
  expect(await runTool(ctx, tool, {})).toMatchObject({ ok: false, error: { code: 'forbidden' } });
  expect(calls.map(call => call.path)).toEqual(['ai_audit_write']);
});

it.each(['get_my_workout_today', 'get_my_nutrition_today'])('does not accept a player ID for %s', async tool => {
  const { ctx } = fixture();
  expect(await runTool(ctx, tool, { playerId: foreign })).toMatchObject({ ok: false, error: { code: 'invalid_input' } });
});

it('writes the caller’s meal with the chosen swaps and audits it as a write', async () => {
  const { ctx, calls } = fixture();
  const swaps = { [item]: alternative };
  expect(await runTool(ctx, 'log_my_meal', { mealId: meal, swaps })).toMatchObject({
    ok: true, data: { eaten: { kcal: 200 }, remaining: { kcal: 1800 } },
  });
  expect(calls).toContainEqual({ path: 'ai_log_meal', body: {
    p_meal_id: meal, p_log_date: today, p_eaten: true, p_swaps: swaps,
    p_eaten_macros: { kcal: 200, protein: 20, carbs: 30, fat: 2 },
  } });
  expect(calls).toContainEqual({ path: 'ai_audit_write', body: expect.objectContaining({ p_kind: 'write' }) });
  expect(await runTool(ctx, 'get_my_nutrition_today', {})).toMatchObject({
    ok: true, data: { meals: [{ eaten: true, swaps }] },
  });
  expect(await runTool(ctx, 'log_my_meal', { mealId: meal, eaten: false })).toMatchObject({
    ok: true, data: { eaten: { kcal: 0 }, remaining: { kcal: 2000 } },
  });
  expect(await runTool(ctx, 'get_my_nutrition_today', {})).toMatchObject({
    ok: true, data: { meals: [{ eaten: false, swaps }] },
  });
});

it.each([
  { args: { mealId: meal, swaps: { [item]: foreign } }, code: 'invalid_input', noPlan: false },
  { args: { mealId: foreign }, code: 'not_found', noPlan: false },
  { args: { mealId: meal }, code: 'not_found', noPlan: true },
])('rejects $code meal logs before writing', async ({ args, code, noPlan }) => {
  const { ctx, calls } = fixture({ noPlan });
  expect(await runTool(ctx, 'log_my_meal', args)).toMatchObject({ ok: false, error: { code } });
  expect(calls.map(call => call.path)).not.toContain('ai_log_meal');
});
