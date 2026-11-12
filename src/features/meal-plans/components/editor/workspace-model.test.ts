import { expect, it } from 'vitest';
import { automaticTargets, openRestDay, tileState } from './workspace-model';
import { unitGrams } from '../../editor-rules';
import { planTotals } from '../../totals';
import { setGrams } from '../../draft';
import type { PlanDraft } from '../../types';
import type { PlayerFacts } from '@/features/player-file';

const source = { kind: 'intake', id: 'player', at: '2026-11-12' };
const facts: PlayerFacts = {
  weight: { key: 'weight', value: 80, source, isNew: false },
  height: { key: 'height', value: 180, source, isNew: false },
  age: { key: 'age', value: 30, source, isNew: false },
  sex: { key: 'sex', value: 'male', source, isNew: false },
  trainingDays: { key: 'trainingDays', value: [0, 2, 4], source, isNew: false },
  sessionMinutes: { key: 'sessionMinutes', value: 60, source, isNew: false },
  targetWeight: { key: 'targetWeight', value: 75, source, isNew: false },
};
const draft: PlanDraft = { id: 'p', playerId: 'player', title: 'Plan', status: 'draft',
  targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 },
  meals: [{ id: 'meal', name: 'Breakfast', position: 1, dayType: 'all', items: [{ id: 'food', position: 1,
    food: { id: 'egg', name: 'Egg', photo: null, custom: false, kcal: 156, protein: 12, carbs: 1, fat: 10 },
    grams: 150, alternatives: [] }] }],
};
it('fills targets with the existing energy calculator, without inventing missing facts', () => {
  expect(automaticTargets(facts)).toEqual({ kcal: 1898, protein: 160, carbs: 195, fat: 53 });
  expect(automaticTargets({})).toBeNull();
});
it('copies all-day training meals once with independent ids and preserves subsequent rest edits', () => {
  let id = 0;
  const copied = openRestDay(draft, () => `copy-${++id}`);
  expect(copied.meals.map(meal => meal.dayType)).toEqual(['training', 'rest']);
  expect(copied.meals[1]?.items[0]?.id).not.toBe('food');
  expect(openRestDay(copied, () => 'unexpected')).toBe(copied);
  expect(draft.meals[0]?.dayType).toBe('all');
});
it('updates live totals using quantity times household-unit grams', () => {
  const grams = unitGrams(3, { key: 'egg', name_ar: 'حباية', name_en: 'egg', grams: 50 });
  expect(planTotals(draft)).toEqual({ kcal: 234, protein: 18, carbs: 1.5, fat: 15 });
  expect(grams).toBe(150);
  expect(planTotals(setGrams(draft, 'food', unitGrams(2, { key: 'egg', name_ar: 'حباية', name_en: 'egg', grams: 50 })))).toEqual({ kcal: 156, protein: 12, carbs: 1, fat: 10 });
});
it('warns immediately above 100%, caps the bar and handles zero targets', () => {
  expect(tileState(101, 100)).toEqual({ percent: 101, over: true, bar: 100 });
  expect(tileState(100, 100).over).toBe(false);
  expect(tileState(1, 0)).toEqual({ percent: 100, over: true, bar: 100 });
});
