import { describe, expect, it } from 'vitest';
import { addMeal, renameMeal, removeMeal, moveMeal, addItem, setGrams, removeItem, moveItem, addAlternative, removeAlternative } from './draft';
import { mealTotals, planTotals, targetDelta, macroTargetsFromKcal } from './totals';
import { escapeSearch } from './types';
import type { PlanDraft, Food } from './types';

const food: Food = { id: 'food', name: 'رز', photo: null, kcal: 100, protein: 10, carbs: 20, fat: 2 };
const alternative: Food = { ...food, id: 'alt', name: 'مكرونة', kcal: 50 };
const empty: PlanDraft = { id: 'plan', playerId: 'player', title: 'نظام', status: 'draft', targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 }, meals: [] };

describe('nutrition draft', () => {
  it('adds, renames, moves and removes meals with contiguous positions', () => {
    let draft = addMeal(empty, 'فطار', 'm1');
    draft = addMeal(draft, 'غدا', 'm2');
    draft = renameMeal(draft, 'm1', 'عشا');
    draft = moveMeal(draft, 'm2', -1);
    expect(draft.meals.map(m => [m.id, m.position, m.name])).toEqual([['m2', 1, 'غدا'], ['m1', 2, 'عشا']]);
    expect(removeMeal(draft, 'm2').meals[0]?.position).toBe(1);
    expect(empty.meals).toEqual([]);
  });
  it('adds, moves, changes and removes items and alternatives', () => {
    let draft = addMeal(empty, 'فطار', 'm');
    draft = addItem(draft, 'm', food, 100, 'i1');
    draft = addItem(draft, 'm', food, 50, 'i2');
    draft = addAlternative(draft, 'i1', alternative, 'a');
    expect(draft.meals[0]?.items[0]?.alternatives[0]?.grams).toBe(200);
    draft = setGrams(draft, 'i1', 150);
    expect(draft.meals[0]?.items[0]?.alternatives[0]?.grams).toBe(300);
    draft = moveItem(draft, 'i2', -1);
    expect(draft.meals[0]?.items.map(i => [i.id, i.position])).toEqual([['i2', 1], ['i1', 2]]);
    draft = removeAlternative(draft, 'i1', 'a');
    expect(draft.meals[0]?.items[1]?.alternatives).toEqual([]);
    expect(removeItem(draft, 'i2').meals[0]?.items[0]?.position).toBe(1);
    expect(moveMeal(draft, 'm', -1)).toEqual(draft);
    expect(() => setGrams(draft, 'i1', 0)).toThrow();
    expect(() => addAlternative(draft, 'i1', { ...alternative, kcal: 0 }, 'bad')).toThrow();
  });
  it('totals original items only and returns signed deltas', () => {
    let draft = addItem(addMeal(empty, 'فطار', 'm'), 'm', food, 150, 'i');
    draft = addAlternative(draft, 'i', alternative, 'a');
    expect(planTotals(draft)).toEqual({ kcal: 150, protein: 15, carbs: 30, fat: 3 });
    const meal = draft.meals[0];
    if (!meal) throw new Error('missing fixture');
    expect(mealTotals(meal)).toEqual(planTotals(draft));
    expect(targetDelta(planTotals(draft), { kcal: 100, protein: 20, carbs: 30, fat: 4 })).toEqual({ kcal: 50, protein: -5, carbs: 0, fat: -1 });
    expect(planTotals(empty).kcal).toBe(0);
  });
  it('converts energy splits into grams', () => {
    expect(macroTargetsFromKcal(2000)).toEqual({ kcal: 2000, protein: 150, carbs: 225, fat: 56 });
    expect(macroTargetsFromKcal(2000, { p: 40, c: 40, f: 20 })).toEqual({ kcal: 2000, protein: 200, carbs: 200, fat: 44 });
  });
  it('escapes wildcard and PostgREST filter characters', () => {
    expect(escapeSearch('a%_\\"(),')).toBe('a\\\\%\\\\_\\\\\\\\\\"(),');
  });
});
