import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MealLogRow, NutritionSnapshot } from '@/core/offline';
import type * as Nutrition from '@/features/nutrition';
import { LocaleProvider } from '@/core/i18n/client';
import { NutritionSlot } from './components/nutrition-slot';
import { dayNutrition } from './day-nutrition';

const state = vi.hoisted(() => ({ snapshot: null as NutritionSnapshot | null, logs: [] as MealLogRow[], date: '' }));
vi.mock('@/features/nutrition', async original => ({
  ...await original<typeof Nutrition>(),
  useNutritionSnapshot: () => ({ snapshot: state.snapshot, status: 'ready', today: '2026-11-06' }),
  useMealLogs: (date: string) => { state.date = date; return state.logs.filter(row => row.log_date === date && !row.deleted_at); },
}));

const today = '2026-11-06';
const past = '2026-11-05';
const snapshot: NutritionSnapshot = {
  id: 'active', player_id: 'player', plan_id: 'plan', title: 'Plan',
  targets: { kcal: 1800, protein: null, carbs: null, fat: null },
  meals: ['breakfast', 'dinner'].map((id, position) => ({
    id, position, name: id, items: [{
      id: `${id}-item`, position: 0, name: 'Food', grams: 200, photo_path: null,
      per100g: { kcal: 100, protein: 10, carbs: 10, fat: 2 },
      alternatives: [{ id: 'swap', name: 'Alternative', grams: 100, photo_path: null,
        per100g: { kcal: 300, protein: 20, carbs: 20, fat: 5 } }],
    }],
  })),
};
const log = (meal_id: string, log_date = past, changes: Partial<MealLogRow> = {}): MealLogRow => ({
  id: `${meal_id}-${log_date}`, meal_id, log_date, swaps: {},
  completed_at: '2026-11-05T12:00:00Z', client_updated_at: '2026-11-05T12:00:00Z',
  deleted_at: null, ...changes,
});

describe('dayNutrition', () => {
  it('keeps today totals and counts only completed meals for today', () => {
    expect(dayNutrition(snapshot, [log('breakfast', today), log('dinner')], today, today))
      .toEqual({ kind: 'today', eatenKcal: 200, targetKcal: 1800, mealsDone: 1, mealsTotal: 2 });
  });
  it('uses the selected past date and its swaps', () => {
    expect(dayNutrition(snapshot, [log('breakfast', past, { swaps: { 'breakfast-item': 'swap' } }),
      log('dinner', today)], past, today))
      .toEqual({ kind: 'past', eatenKcal: 300, targetKcal: 1800, mealsDone: 1, mealsTotal: 2 });
  });
  it('returns only plan numbers for the future even if logs exist', () => {
    expect(dayNutrition(snapshot, [log('breakfast', '2026-11-07')], '2026-11-07', today))
      .toEqual({ kind: 'future', targetKcal: 1800, mealsTotal: 2 });
  });
  it('returns zero eaten and completed meals with no logs', () => {
    expect(dayNutrition(snapshot, [], past, today)).toMatchObject({ eatenKcal: 0, mealsDone: 0 });
  });
  it('counts all meals done once, ignoring unrelated logs', () => {
    expect(dayNutrition(snapshot, [log('breakfast'), log('dinner'), log('removed-meal')], past, today))
      .toMatchObject({ eatenKcal: 400, mealsDone: 2 });
  });
  it('ignores deleted and incomplete logs', () => {
    expect(dayNutrition(snapshot, [log('breakfast', past, { deleted_at: '2026-11-05T13:00:00Z' }),
      log('dinner', past, { completed_at: null })], past, today))
      .toMatchObject({ eatenKcal: 0, mealsDone: 0 });
  });
  it('uses meal macro totals when the plan has no calorie target', () => {
    expect(dayNutrition({ ...snapshot, targets: { ...snapshot.targets, kcal: null } }, [], past, today))
      .toMatchObject({ targetKcal: 400 });
  });
});

describe('selected day nutrition card', () => {
  beforeEach(() => { state.snapshot = snapshot; state.logs = []; state.date = ''; });
  const render = (date?: string, locale: 'ar' | 'en' = 'en') => renderToStaticMarkup(
    createElement(LocaleProvider, { locale }, createElement(NutritionSlot, { date })),
  );
  it('keeps today linked with the next meal and defaults to today', () => {
    const html = render();
    expect(state.date).toBe(today);
    expect(html).toContain('href="/player/nutrition"');
    expect(html).toContain("Today&#x27;s meals");
    expect(html).toContain('Next meal: breakfast');
    expect(html).toContain('0 / 1,800 kcal');
  });
  it('shows past totals and completed meals without a link or next meal', () => {
    state.logs = [log('breakfast')];
    const html = render(past);
    expect(state.date).toBe(past);
    expect(html).toContain('Food · Thu');
    expect(html).toContain('200 / 1,800 kcal');
    expect(html).toContain('1 of 2 meals');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('Next meal');
    expect(html).toContain('motion-reduce:animate-none');
  });
  it('shows the no logs message for a past day', () => {
    const html = render(past);
    expect(html).toContain('0 / 1,800 kcal');
    expect(html).toContain('No food logged that day');
  });
  it('shows only the future plan and pluralizes a single meal', () => {
    state.snapshot = { ...snapshot, meals: snapshot.meals.slice(0, 1) };
    const html = render('2026-11-07');
    expect(html).toContain('Food · Sat');
    expect(html).toContain('1,800 kcal · 1 meal');
    expect(html).toContain('Your plan for that day');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('Next meal');
    expect(html).not.toContain(' / ');
  });
  it('uses Egyptian Arabic weekday and summary messages', () => {
    state.logs = [log('breakfast')];
    const html = render(past, 'ar');
    expect(html).toContain('أكل خميس');
    expect(html).toContain('وجبات');
    expect(html).not.toContain('<a');
  });
});
