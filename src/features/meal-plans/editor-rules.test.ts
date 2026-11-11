import { expect, it } from 'vitest';
import { targetStatus, unitGrams, unitQuantity, dayMeals, dayTargets, copyTrainingMeals, moveVisibleMeal } from './editor-rules';
import { flagFood } from './food-flags';
import { adherenceDays, planAdherence, smartNotes } from './smart-notes';
import type { Food, PlanDraft } from './types';

const food: Food = { id: 'egg', name: 'بيض مسلوق', custom: false, photo: null, kcal: 150, protein: 12, carbs: 1, fat: 10 };
const draft: PlanDraft = { id: 'plan', playerId: 'p', title: 'Plan', status: 'draft', targets: { kcal: 2000, protein: 120, carbs: 200, fat: 60 },
  meals: [{ id: 'm', name: 'Breakfast', position: 1, dayType: 'training', items: [{ id: 'i', food, grams: 100, position: 1, alternatives: [] }] },
    { id: 'shared', name: 'Shared', position: 2, items: [] }] };
it.each([[95,100,'within'],[105,100,'within'],[106,100,'over'],[94,100,'under'],[0,0,'within'],[1,0,'over']])('classifies %s / %s', (planned, target, expected) => {
  expect(targetStatus(Number(planned), Number(target))).toBe(expected);
});
it('converts household portions through grams without rounding macros prematurely', () => {
  expect(unitGrams(1.5, { key: 'loaf', name_ar: 'رغيف', name_en: 'loaf', grams: 90 })).toBe(135);
  expect(unitQuantity(135, { key: 'loaf', name_ar: 'رغيف', name_en: 'loaf', grams: 90 })).toBe(1.5);
  expect(unitGrams(100)).toBe(100);
  expect(() => unitGrams(NaN)).toThrow();
});
it('includes shared meals on both days and uses the calculator cycle', () => {
  expect(dayMeals(draft.meals, 'rest').map(m => m.id)).toEqual(['shared']);
  expect(dayMeals(draft.meals, 'training')).toHaveLength(2);
  expect(dayTargets(draft.targets, 4, 'training').kcal).toBe(2160);
  expect(dayTargets(draft.targets, 4, 'rest').kcal).toBe(1790);
  expect(dayTargets({ ...draft.targets, kcal: 0 }, 4, 'training').kcal).toBe(0);
});
it('copies training meals with fresh hierarchy ids while retaining shared meals', () => {
  let id = 0;
  const result = copyTrainingMeals(draft, () => `copy-${++id}`);
  expect(result.meals).toHaveLength(3);
  expect(result.meals[2]).toMatchObject({ id: 'copy-1', dayType: 'rest', items: [{ id: 'copy-2' }] });
  expect(draft.meals).toHaveLength(2);
});
it('matches bilingual allergy aliases, tags and medical flags without matching eggplant as egg', () => {
  expect(flagFood(food, { allergies: { key: 'allergies', value: ['eggs'], source: { kind: 'intake', id: 'p', at: '' }, isNew: false } })).toEqual(['eggs']);
  expect(flagFood({ ...food, name: 'Eggplant' }, { allergies: { key: 'allergies', value: ['egg'], source: { kind: 'intake', id: 'p', at: '' }, isNew: false } })).toEqual([]);
  expect(flagFood({ ...food, name: 'Soup', tags: ['حليب'] }, { allergies: { key: 'allergies', value: ['dairy'], source: { kind: 'intake', id: 'p', at: '' }, isNew: false } })).toEqual(['dairy']);
});
it('suggests a concrete increase using an unflagged food and respects the maximum portion', () => {
  expect(smartNotes(draft.meals, draft.targets, {})).toContainEqual(expect.objectContaining({ kind: 'gap', itemId: 'i', macro: 'protein', grams: 900 }));
  expect(smartNotes([{ ...draft.meals[0], id: 'm', name: 'Meal', position: 1, items: [{ id: 'i', food, grams: 2000, position: 1, alternatives: [] }] }], { kcal: 8000, protein: 1000, carbs: 1000, fat: 1000 }, {})).toEqual([]);
});
it('returns exactly seven local dates and ignores deleted, incomplete, duplicate and future logs', () => {
  expect(adherenceDays([{ log_date: '2026-11-11', meal_id: 'm', completed_at: 'x', deleted_at: null },
    { log_date: '2026-11-11', meal_id: 'm', completed_at: 'x', deleted_at: null },
    { log_date: '2026-11-10', meal_id: 'm', completed_at: null, deleted_at: null }], '2026-11-11', ['m']))
    .toEqual(Array.from({ length: 7 }, (_, i) => ({ date: `2026-11-${String(i + 5).padStart(2, '0')}`, completed: i === 6 ? 1 : 0, expected: 1 })));
});
it('raises allergy notes and never suggests increasing an allergen', () => {
  const facts = { allergies: { key: 'allergies' as const, value: ['eggs'], source: { kind: 'intake', id: 'p', at: '' }, isNew: false } };
  expect(smartNotes(draft.meals, draft.targets, facts)).toEqual([{ kind: 'allergy', itemId: 'i', name: food.name, reasons: ['eggs'] }]);
});
it('matches medical flags and unknown literal allergies without flagging unrelated foods', () => {
  const medical = { key: 'medical' as const, value: ['diabetes', 'hypertension'], source: { kind: 'intake', id: 'p', at: '' }, isNew: false };
  expect(flagFood({ name: 'Salted fish with honey' }, { medical })).toEqual(['diabetes', 'hypertension']);
  expect(flagFood({ name: 'Chicken' }, { medical })).toEqual([]);
});
it('matches persisted seafood and blood_pressure intake codes', () => {
  const source = { kind: 'intake', id: 'p', at: '' };
  expect(flagFood({ name: 'جمبري' }, { allergies: { key: 'allergies', value: ['seafood'], source, isNew: false } })).toEqual(['seafood']);
  expect(flagFood({ name: 'Salted fish' }, { medical: { key: 'medical', value: ['blood_pressure'], source, isNew: false } })).toEqual(['blood_pressure']);
});
it('moves across hidden meals while retaining their positions', () => {
  const base = draft.meals[0];
  if (!base) throw new Error('Missing fixture');
  const mixed = { ...draft, meals: [{ ...base, id: 'a' }, { ...base, id: 'r', dayType: 'rest' as const }, { ...base, id: 'b' }] };
  expect(moveVisibleMeal(mixed, 'a', 1, 'training').meals.map(meal => meal.id)).toEqual(['b', 'r', 'a']);
});
it('counts adherence against each calendar day type rather than the selected editor tab', () => {
  const base = draft.meals[0];
  if (!base) throw new Error('Missing fixture');
  const meals = [{ ...base, id: 'training', dayType: 'training' as const }, { ...base, id: 'rest', dayType: 'rest' as const }, { ...base, id: 'shared', dayType: 'all' as const }];
  const logs = [{ log_date: '2026-11-11', meal_id: 'rest', completed_at: 'x', deleted_at: null }];
  expect(planAdherence(logs, '2026-11-11', meals, [4]).at(-1)).toEqual({ date: '2026-11-11', completed: 0, expected: 2 });
});
