import { describe, expect, it } from 'vitest';
import { mapExercise } from './map-exercise.ts';
import { mapFood } from './map-food.ts';
import { mergeArabicNames } from './merge-names.ts';
import type { ArabicNameProposal } from './merge-names.ts';

const exercise = {
  dataset_id: '0001', name_en: 'Sit-up', name_ar: 'بطن', body_part: 'waist',
  target: 'abs', equipment: 'body weight', secondary_muscles: ['hips'],
  instructions_en: ['Lift'], instructions_ar: ['ارفع'], gif_file: '0001.gif',
};
const food = {
  name: 'Rice', name_ar: 'أرز', kcal_per_100g: 130, protein_per_100g: 2.7,
  carbs_per_100g: 28.2, fat_per_100g: 0.3, photo_file: 'rice.webp',
};

describe('seed mappers', () => {
  it('maps a full exercise without changing source data', () => {
    const { gif_file, ...fields } = exercise;
    expect(mapExercise(exercise, new Set([gif_file]))).toEqual({
      ...fields, owner_id: null, media_path: 'exercise-media/0001.gif',
    });
  });
  it('preserves null Arabic names and instructions', () => {
    expect(mapExercise({ ...exercise, name_ar: null, instructions_ar: null },
      new Set(['0001.gif']))).toMatchObject({ name_ar: null, instructions_ar: null });
  });
  it('maps a full food with a stable seed key from its photo filename', () => {
    expect(mapFood(food, new Set(['rice.webp']))).toEqual({
      owner_id: null, name_en: 'Rice', name_ar: 'أرز', kcal_per_100g: 130,
      protein_per_100g: 2.7, carbs_per_100g: 28.2, fat_per_100g: 0.3,
      photo_path: 'food-media/rice.webp', seed_key: 'rice',
    });
  });
  it.each(['rice.jpg', 'rice.jpeg', 'rice.WEBP', 'brown.rice.webp'])(
    'removes only the final extension from %s for the food seed key', (photo_file) => {
      expect(mapFood({ ...food, photo_file }, new Set([photo_file])))
        .toMatchObject({ seed_key: photo_file.startsWith('brown.') ? 'brown.rice' : 'rice' });
    },
  );
  it.each([
    ['exercise', () => mapExercise(exercise, new Set())],
    ['food', () => mapFood(food, new Set())],
  ])('rejects missing %s media', (_name, map) => {
    expect(map).toThrow(/media/i);
  });
  it('rejects malformed entries and unsafe filenames', () => {
    expect(() => mapExercise({ ...exercise, gif_file: '../0001.gif' },
      new Set(['../0001.gif']))).toThrow();
    expect(() => mapFood({ ...food, fat_per_100g: -1 }, new Set(['rice.webp']))).toThrow();
    expect(() => mapExercise({ ...exercise, instructions_en: 'Lift' },
      new Set(['0001.gif']))).toThrow();
  });
});

describe('mergeArabicNames', () => {
  const proposals: ArabicNameProposal[] = [
    { dataset_id: '0001', name_ar: 'اسم مقترح', confidence: 'high' },
    { dataset_id: '0002', name_ar: 'سكوات', confidence: 'medium' },
    { dataset_id: '0003', name_ar: 'ضغط صدر', confidence: 'low' },
    { dataset_id: '0004', name_ar: 'بايسبس', confidence: 'high' },
  ];
  const exercises = [
    { dataset_id: '0003', name_ar: null, target: 'pectorals' },
    { dataset_id: '0001', name_ar: 'بطن', target: 'abs' },
    { dataset_id: '0004', target: 'biceps' },
    { dataset_id: '0002', name_ar: '', target: 'quads' },
  ];

  it('does not overwrite an existing name or mutate either input', () => {
    const beforeExercises = structuredClone(exercises);
    const beforeProposals = structuredClone(proposals);
    const result = mergeArabicNames(exercises, proposals, { minConfidence: 'low' });
    expect(result[1]).toEqual({ dataset_id: '0001', name_ar: 'بطن', target: 'abs' });
    expect(result).not.toBe(exercises);
    expect(exercises).toEqual(beforeExercises);
    expect(proposals).toEqual(beforeProposals);
  });

  it.each([
    ['high', [null, 'بطن', 'بايسبس', '']],
    ['medium', [null, 'بطن', 'بايسبس', 'سكوات']],
    ['low', ['ضغط صدر', 'بطن', 'بايسبس', 'سكوات']],
  ] as const)('respects the inclusive %s confidence threshold', (minConfidence, names) => {
    expect(mergeArabicNames(exercises, proposals, { minConfidence })
      .map((entry) => entry.name_ar)).toEqual(names);
  });

  it('ignores unknown ids', () => {
    expect(mergeArabicNames(exercises, [
      { dataset_id: 'unknown', name_ar: 'سكوات', confidence: 'high' },
    ], { minConfidence: 'low' })).toEqual(exercises);
  });

  it('preserves input order even when proposals have a different order', () => {
    expect(mergeArabicNames(exercises, proposals, { minConfidence: 'low' })
      .map((entry) => entry.dataset_id)).toEqual(['0003', '0001', '0004', '0002']);
  });
});
