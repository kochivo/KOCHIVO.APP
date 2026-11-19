import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { arStd } from './standard-messages';

it.each([[0, '0 يوم'], [1, 'يوم واحد'], [2, 'يومين'], [3, '3 أيام'], [10, '10 أيام'], [13, '13 يوم']])(
  'formats Egyptian day counts for %s', (n, expected) => {
    expect(createT(messages, 'ar')('dayCount', { n, count: String(n) })).toBe(expected);
  });
it('uses singular after thirteen for absence and renewal in both Arabic styles', () => {
  const vars = { n: 13, count: '13' };
  const t = createT(messages, 'ar');
  expect(t('absent', vars)).toBe('غايب 13 يوم');
  expect(t('renewal', vars)).toBe('بيخلص بعد 13 يوم');
  const standard = createT({ ar: arStd, en: messages.en }, 'ar');
  expect(standard('absent', vars)).toBe('غائب 13 يومًا');
  expect(standard('renewal', vars)).toBe('ينتهي بعد 13 يومًا');
  expect(createT(messages, 'en')('days', { n: 1, count: '1' })).toBe('Ends tomorrow');
});
