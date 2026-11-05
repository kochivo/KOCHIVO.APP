import { expect, it } from 'vitest';
import { formatLength, formatWeight } from './units';

it('formats stored kg and cm without changing the stored values', () => {
  expect(formatWeight(100, 'metric', 'en')).toBe('100 kg');
  expect(formatWeight(100, 'imperial', 'en')).toBe('220.5 lb');
  expect(formatLength(180, 'metric', 'en')).toBe('180 cm');
  expect(formatLength(180, 'imperial', 'en')).toBe('70.9 in');
  expect(formatWeight(0, 'imperial', 'en')).toBe('0 lb');
});
