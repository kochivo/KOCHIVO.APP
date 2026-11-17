import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { loadActivity } from './load-activity';

const state = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: state.client }));

it.each([
  [true, null, ['all', 'rest'], 200, null],
  [false, null, ['all', 'training'], 200, null],
  [false, 'rest', ['all', 'rest'], 200, null],
  [true, 'logged', ['all', 'training', 'rest'], 300, null],
  [true, 'logged', ['all', 'training', 'rest'], 300, { kcal: 50, protein: 2, carbs: 3, fat: 1 }],
])('uses the player day rule, logged meals and daily fallback targets (%s, %s)', async (rest, override, ids, kcal, eaten) => {
  const calls: string[] = [];
  const food = { name_ar: 'Food', photo_path: null, kcal_per_100g: 100, protein_per_100g: 10, carbs_per_100g: 5, fat_per_100g: 1 };
  const client = createClient<AppDatabase>('https://test.invalid', 'test', { global: { fetch: async input => {
    const url = new URL(String(input)), table = url.pathname.split('/').at(-1);
    calls.push(url.searchParams.get('select') ?? '');
    const rows = table === 'programs' ? [{ id: 'program', title: 'Program', notes: null, settings: { repeatWeekly: true },
      program_days: [{ id: 'day', position: 0, title: 'Day', weekday: 2, is_rest_day: rest }] }]
      : table === 'player_intake' ? [{ training_days: [] }]
      : table === 'readiness_decisions' ? (override === 'rest' ? [{ decision: 'rest' }] : [])
      : table === 'nutrition_plans' ? [{ id: 'plan', title: 'Plan', target_kcal: null, target_protein: null, target_carbs: null, target_fat: null,
        meals: ['all', 'training', 'rest'].map((day_type, position) => ({ id: day_type, name: day_type, day_type, position,
          meal_items: [{ id: day_type, position: 0, grams: 100, foods: food, meal_item_alternatives: [] }] })) }]
      : table === 'meal_logs' && override === 'logged' ? [{ id: 'log', meal_id: 'training', completed_at: '2026-11-16T10:00:00Z',
        log_date: '2026-11-16', deleted_at: null, swaps: {}, eaten_macros: eaten }] : [];
    const single = table === 'programs' || table === 'player_intake' || table === 'nutrition_plans' || table === 'readiness_decisions'
      || table === 'workout_sessions' && url.searchParams.has('limit');
    return Response.json(single ? rows[0] ?? null : rows);
  } } });
  state.client.mockResolvedValue(client);
  const result = await loadActivity('player', '2026-11-16');
  expect(result.nutrition?.meals.map(meal => meal.id)).toEqual(ids);
  expect(result.nutrition?.targets.kcal).toBe(kcal);
  expect(result.nutrition?.eaten.kcal).toBe(override === 'logged' ? eaten?.kcal ?? 100 : 0);
  expect(calls.some(select => select.includes('day_type'))).toBe(true);
});
