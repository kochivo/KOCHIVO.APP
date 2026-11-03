import { expect, it } from 'vitest';
import { customExerciseSchema, optimisticExercise, prependExercise } from './custom-exercises';

const input = { name: ' Press ', bodyPart: 'chest', target: '', videoUrl: '' };
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
