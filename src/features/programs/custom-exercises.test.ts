import { expect, it } from 'vitest';
import { bodyPartFilter, bodyParts, customExerciseSchema, optimisticExercise, prependExercise } from './custom-exercises';

const input = { name: ' Press ', bodyPart: 'chest', target: '', videoUrl: '' };
it('maps core and glutes to both custom exercises and the GIF library', () => {
  expect(bodyParts.slice(bodyParts.indexOf('waist'), bodyParts.indexOf('waist') + 3)).toEqual(['waist', 'core', 'glutes']);
  expect(bodyPartFilter('core')).toEqual([{ column: 'body_part', value: 'core' }, { column: 'body_part', value: 'waist' }]);
  expect(bodyPartFilter('glutes')).toEqual([{ column: 'body_part', value: 'glutes' }, { column: 'target', value: 'glutes' }]);
  expect(bodyPartFilter('chest')).toEqual([{ column: 'body_part', value: 'chest' }]);
  expect(bodyPartFilter('')).toEqual([]);
});
it('validates cardio machines and clears equipment for other body parts', () => {
  for (const equipment of [undefined, null, 'treadmill', 'stairmaster']) {
    const parsed = customExerciseSchema.parse({ ...input, bodyPart: 'cardio', equipment });
    expect(optimisticExercise('id', parsed).equipment).toBe(equipment ?? null);
  }
  for (const equipment of ['', 'bike', 1]) {
    expect(customExerciseSchema.safeParse({ ...input, bodyPart: 'cardio', equipment }).success).toBe(false);
  }
  expect(optimisticExercise('id', customExerciseSchema.parse({ ...input, equipment: 'treadmill' })).equipment).toBeNull();
  for (const bodyPart of ['core', 'glutes']) expect(customExerciseSchema.safeParse({ ...input, bodyPart }).success).toBe(true);
});
it('trims names and accepts only library body parts and HTTPS video URLs', () => {
  expect(customExerciseSchema.parse(input).name).toBe('Press');
  for (const patch of [{ name: ' ' }, { name: 'a'.repeat(61) }, { bodyPart: 'other' },
    { target: 'a'.repeat(41) }, { videoUrl: 'http://example.com' }, { videoUrl: 'javascript:alert(1)' },
    { videoUrl: 'https://' }, { videoUrl: `https://example.com/${'a'.repeat(500)}` }]) {
    expect(customExerciseSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  }
  expect(customExerciseSchema.safeParse({ ...input, videoUrl: 'https://example.com/video' }).success).toBe(true);
});
it('puts an optimistic row first and reconciles its ID without duplicates', () => {
  const optimistic = optimisticExercise('new', customExerciseSchema.parse(input));
  const old = { ...optimistic, id: 'old' };
  const pending = prependExercise([old], optimistic);
  expect(pending.map(row => row.id)).toEqual(['new', 'old']);
  const saved = { ...optimistic, name_en: 'Saved' };
  expect(prependExercise(pending, saved)).toEqual([saved, old]);
  expect(optimistic).toMatchObject({ is_own: true, video_url: null, name_ar: 'Press' });
});
