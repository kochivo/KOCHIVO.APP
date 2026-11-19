import { afterEach, expect, it, vi } from 'vitest';
import * as ai from '@/features/ai-tools/server';
import { factsBudget, formatFacts, loadFacts, nutritionFacts } from './data/facts';
import type { KoActor } from './data/account';

vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({
  getTimezone: async () => 'Africa/Cairo',
  getPlayerTimezone: async () => 'Africa/Cairo',
}));

const now = Date.parse('2026-11-19T22:30:00Z');
const id = '11111111-1111-4111-8111-111111111111';

afterEach(() => vi.restoreAllMocks());

it('formats bounded sections using Latin digits and no identifiers or contact details', () => {
  const details = ['تقدّم ٣٦', id, 'coach@example.test', '+20 123 456 7890',
    ...Array.from({ length: 100 }, (_, index) => 'full exercise name number ' + index)];
  const facts = formatFacts([['workout_today', details], ['progress', ['last workout 2026-11-19']]]);
  expect(new TextEncoder().encode(facts).length).toBeLessThanOrEqual(factsBudget);
  expect(facts).toContain('تقدّم 36');
  expect(facts).not.toMatch(/11111111|example\.test|456 7890|number 99/);
  expect(facts).toContain('[progress] last workout 2026-11-19');
});

it('loads the player’s two local workout dates, nutrition, progress and captain', async () => {
  const workout = vi.spyOn(ai, 'playerWorkout').mockResolvedValueOnce({ rest: true, day: undefined }).mockResolvedValueOnce(null);
  vi.spyOn(ai, 'playerNutritionPlan').mockResolvedValue({
    id: 'active', player_id: id, plan_id: id, title: 'Plan',
    targets: { kcal: 2100, protein: 150, carbs: 250, fat: 60 },
    meals: [{
      id, name: 'Lunch', position: 0,
      items: [{ id, position: 0, name: 'Rice', grams: 204, photo_path: null,
        per100g: { kcal: 100, protein: 4, carbs: 20, fat: 0 }, alternatives: [] }],
    }],
  });
  vi.spyOn(ai, 'playerMealLogs').mockResolvedValue([{
    id, meal_id: id, log_date: '2026-11-20', swaps: {}, completed_at: null,
    client_updated_at: '2026-11-20T10:00:00Z', deleted_at: null,
  }]);
  const query = {
    select: () => query, eq: () => query, not: () => query, lte: () => query, order: () => query, limit: () => query,
    maybeSingle: async () => ({ data: { training_date: '2026-11-18' }, error: null }),
  };
  const rpc = vi.fn(async (name: string) => ({
    data: name === 'my_points'
      ? { done: 13, planned: 15, adherence: 86, lifetime: 320, tier: 'entry', crown_gap: 28 }
      : [{ full_name: 'Adel', phone: '01012345678' }], error: null,
  }));
  const actor = { id, role: 'player', db: { from: () => query, rpc } } as unknown as KoActor;
  const pack = await loadFacts(actor, now, new AbortController().signal);
  expect(workout.mock.calls.map(([, day]) => day)).toEqual(['2026-11-20', '2026-11-21']);
  expect(pack).toContain('[workout_today] rest day');
  expect(pack).toContain('[workout_tomorrow] no program');
  expect(pack).toContain('[nutrition_today] kcal remaining 2100 / target 2100; protein g remaining 150 / target 150; carbs g remaining 250 / target 250; fat g remaining 60 / target 60; eaten kcal 0, protein 0 g, carbs 0 g, fat 0 g; Lunch (logged skipped); Lunch: Rice 204 g');
  expect(pack).toContain('[progress] month done 13, planned 15, adherence 86%');
  expect(pack).toContain('points to crown 28');
  expect(pack).toContain('last workout 2026-11-18');
  expect(pack).toContain('[captain] Adel');
  expect(pack).not.toMatch(/11111111|01012345678/);
});

it('keeps saved nutrition facts when the active plan is gone', () => {
  const today = '2026-11-20';
  const stamp = '2026-11-20T01:00:00Z';
  expect(nutritionFacts(null, [{
    id, meal_id: null, log_date: today, swaps: {}, completed_at: stamp, client_updated_at: stamp, deleted_at: null,
    eaten_macros: { kcal: 500, protein: 25, carbs: 60, fat: 18 },
  }], today)).toContain('eaten kcal 500, protein 25 g, carbs 60 g, fat 18 g');
});

it('loads a captain roster, scoped screen summary, crown leader and bounded upcoming subscriptions', async () => {
  const roster = Array.from({ length: 12 }, (_, index) => ({
    player_id: 'player' + index, full_name: 'Player ' + index, last_training_date: '2026-11-10', access_until: '2026-11-24',
  }));
  const links = roster.map(row => ({ player_id: row.player_id, pending: false, frozen_at: null }));
  const query = { select: () => query, eq: () => query, is: async () => ({ data: links, error: null }) };
  const swaps = { select: () => swaps, eq: () => swaps, then: (resolve: (data: object) => void) => resolve({ count: 0, error: null }) };
  const rpc = vi.fn(async (name: string) => ({
    data: name === 'captain_roster' ? roster : [
      { player_id: 'player0', display_name: 'Player Zero', is_crown: true, done: 12, planned: 12, adherence: 100 },
    ], error: null,
  }));
  const actor = { id, role: 'captain', db: {
    rpc, from: (table: string) => table === 'coach_clients' ? query : swaps,
  } } as unknown as KoActor;
  const pack = await loadFacts(actor, now, new AbortController().signal, { id: 'player0', name: 'Player Zero' });
  expect(pack).toContain('[team_summary] roster count 12; inactive 7+ days: 12; subscriptions ending within 7 days: 12; crown leader: Player Zero');
  expect(pack.match(/inactive: Player /g)).toHaveLength(10);
  expect(pack).toContain('expiring: Player 0 2026-11-24');
  expect(pack).not.toContain('expiring: Player 10');
  expect(pack).toContain('[player_summary]');
  expect(pack).toContain('Player 0');
  expect(pack).not.toContain('player0');
});
