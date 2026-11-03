import { describe, expect, it } from 'vitest';
import { mapExercise } from './map-exercise.ts';
import { mapFood } from './map-food.ts';

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
