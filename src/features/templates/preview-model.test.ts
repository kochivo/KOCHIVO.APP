import { describe, expect, it } from 'vitest';
import { nutritionPreview, programPreview, reps } from './preview-model';

describe('template preview', () => {
  it('orders days and exercises by position and shows rep ranges', () => {
    const preview = programPreview({ program_days: [
      { position: 2, title: 'Pull', program_exercises: [] },
      { position: 1, title: 'Push', program_exercises: [
        { position: 2, sets: 3, reps_min: 10, reps_max: 10, exercises: { name_ar: null, name_en: 'Dip' } },
        { position: 1, sets: 4, reps_min: 8, reps_max: 12, exercises: { name_ar: 'بنش', name_en: 'Bench' } },
      ] },
    ] });
    expect(preview.groups.map(group => group.title)).toEqual(['Push', 'Pull']);
    expect(preview.groups[0]?.items).toEqual([
      { name_ar: 'بنش', name_en: 'Bench', sets: 4, reps: '8–12' },
      { name_ar: null, name_en: 'Dip', sets: 3, reps: '10' },
    ]);
  });
  it('shows a single rep count when there is no range', () => {
    expect(reps(5, null)).toBe('5');
    expect(reps(6, 6)).toBe('6');
  });
  it('computes calories per item and for the whole day', () => {
    const preview = nutritionPreview({ meals: [
      { position: 1, name: 'Lunch', meal_items: [
        { position: 1, grams: 150, foods: { name_ar: 'رز', name_en: 'Rice', kcal_per_100g: 130 } },
        { position: 2, grams: 200, foods: { name_ar: 'فراخ', name_en: 'Chicken', kcal_per_100g: 165 } },
      ] },
    ] });
    if (preview.kind !== 'nutrition') throw new Error('expected a nutrition preview');
    expect(preview.kcal).toBe(525);
    expect(preview.groups[0]?.items.map(item => item.kcal)).toEqual([195, 330]);
  });
});
