import { expect, it } from 'vitest';
import { exerciseName, foodName } from './display-name';

it.each([exerciseName, foodName])('selects database names with locale fallbacks', name => {
  const row = { name_ar: 'سكوات', name_en: 'Squat' };
  expect(name(row, 'en')).toBe('Squat');
  expect(name(row, 'ar')).toBe('سكوات');
  for (const missing of [null, undefined, '']) {
    expect(name({ name_ar: 'سكوات', name_en: missing }, 'en')).toBe('سكوات');
    expect(name({ name_ar: missing, name_en: 'Squat' }, 'ar')).toBe('Squat');
  }
  expect(name({}, 'en')).toBe('');
});
