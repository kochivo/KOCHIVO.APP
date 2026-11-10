import { expect, it } from 'vitest';
import { messages } from './messages';

it.each(['ar', 'en'] as const)('provides both crown gap variants and holder text in %s', locale => {
  const text = messages[locale];
  expect(text.crown_close.replace('{n}', '2')).toBe(locale === 'ar'
    ? 'التاج قريب! التمارين الناقصة: 2، وفاضل 3 أيام' : 'The crown is close! Workouts still needed: 2, 3 days left');
  expect(text.crown_close_points.replace('{gap}', '14')).toBe(locale === 'ar'
    ? 'التاج قريب! فاضلك 14 درجة' : 'The crown is close! 14 points to go');
  expect(text.crown_defend).toBe(locale === 'ar'
    ? 'حافظ على التاج: فاضل 3 أيام على آخر الشهر' : 'Keep the crown: 3 days left this month');
});
