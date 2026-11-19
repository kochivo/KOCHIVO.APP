import { createClient } from '@supabase/supabase-js';
import { afterEach, expect, it, vi } from 'vitest';
import { runTool } from '@/features/ai-tools/server';
import type { AppDatabase } from '@/types/app-database';
import type { KoActor } from './data/account';
import { executeIntent } from './data/execute';
import { matchPlanMeal, mealToolContext } from './data/log-meal';

vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({ getPlayerTimezone: async () => 'Africa/Cairo' }));

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const captain = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const training = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const rest = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const now = Date.parse('2026-11-18T23:00:00Z');
afterEach(() => vi.unstubAllEnvs());
const makeMeal = (id: string, day_type: 'rest' | 'training', name: string, grams: number) => ({
  id, name: 'Lunch', day_type, position: 1, meal_items: [{
    id, position: 1, grams, foods: { name_ar: name, name_en: name, photo_path: null,
      kcal_per_100g: 100, protein_per_100g: 5, carbs_per_100g: 10, fat_per_100g: 1 },
    meal_item_alternatives: [],
  }],
});

function actor(): KoActor {
  const fetch: typeof globalThis.fetch = async input => {
    const url = new URL(String(input));
    switch (url.pathname.split('/').at(-1)) {
      case 'readiness_decisions':
        return Response.json(url.searchParams.get('player_id') === `eq.${id}` &&
          url.searchParams.get('decision_date') === 'eq.2026-11-19' ? [{ decision: 'rest' }] : []);
      case 'programs':
        return Response.json([{ id, settings: {}, program_days: [{
          id, position: 0, weekday: 5, title: 'Workout', program_exercises: [],
        }] }]);
      case 'nutrition_plans':
        return Response.json([{ id, captain_id: captain, title: 'Plan', target_kcal: 2000, target_protein: 150, target_carbs: 225, target_fat: 56,
          meals: [makeMeal(training, 'training', 'Chicken', 250), makeMeal(rest, 'rest', 'Rice', 125)] }]);
      case 'player_intake':
        return Response.json([{ player_id: id, birth_year: 2000, training_days: [0, 2, 4, 6],
          injuries: [], medical: [], allergies: [], created_at: '2026-11-01T00:00:00Z' }]);
      case 'form_requests':
        return Response.json(url.searchParams.get('captain_id') === `eq.${captain}`
          ? [{ id: 'request', form_id: 'form', answered_at: '2026-11-10T00:00:00Z' }] : []);
      case 'form_questions': return Response.json([{ id: 'question', form_id: 'form', maps_to: 'trainingDays' }]);
      case 'form_answers': return Response.json([{ request_id: 'request', question_id: 'question', value: [0, 2, 4] }]);
      case 'check_ins': return Response.json([]);
      case 'meal_logs':
        return Response.json([{ id, meal_id: null, log_date: '2026-11-19', completed_at: '2026-11-19T01:00:00Z',
          swaps: {}, eaten_macros: { kcal: 500, protein: 25, carbs: 60, fat: 18 } }]);
      case 'ko_rate_take': return Response.json(true);
      case 'ai_audit_write': return new Response(null, { status: 204 });
      default: return Response.json({ message: 'Unexpected request' }, { status: 400 });
    }
  };
  return { id, role: 'player', db: createClient<AppDatabase>('https://test.example', 'key', {
    global: { fetch }, auth: { persistSession: false },
  }) };
}

it('answers rest day and uses only the rest lunch for matching and portions after a captain decision', async () => {
  const player = actor();
  const ctx = await mealToolContext(player, now, new AbortController().signal);
  const workout = await executeIntent(player, { kind: 'my_workout', args: { day: 'today' } }, 'en', '', now);
  expect(workout.text).toMatch(/today is a rest day/i);
  expect(await matchPlanMeal(ctx, 'Lunch')).toMatchObject({ meal: { id: rest }, names: ['Lunch'] });
  const portions = await executeIntent(player, { kind: 'read_nutrition', args: { meal: 'Lunch' } }, 'en', '', now);
  expect(portions.text).toContain('Rice');
  expect(portions.text).toContain('125');
  expect(portions.text).not.toContain('Chicken');
});

it('uses split targets and includes deleted-meal snapshots in the KO nutrition tool', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const ctx = await mealToolContext(actor(), now, new AbortController().signal);
  const result = await runTool(ctx, 'get_my_nutrition_today', {});
  expect(result).toMatchObject({ ok: true, data: {
    dayType: 'rest', targets: { kcal: 1880, protein: 150, carbs: 194, fat: 56 },
    meals: [{ id: rest }], eaten: { kcal: 500 }, remaining: { kcal: 1380 },
  } });
});
