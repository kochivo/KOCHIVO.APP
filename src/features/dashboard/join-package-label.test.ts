import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { homeMessages } from './home/messages';
import { joinPackageLabel } from './home/join-package-label';

afterEach(() => vi.unstubAllEnvs());
it.each([
  [30, null, 'شهر واحد'], [60, null, 'شهرين'], [90, null, '3 شهور'],
  [45, null, '45 يوم'], [1, null, 'يوم واحد'], [null, 12, '12 حصة'], [null, 1, 'حصة واحدة'],
  [null, null, ''], [0, null, ''], [-30, null, ''], [1.5, null, ''],
  [null, 0, ''], [null, -1, ''], [null, 1.5, ''], [30, 12, ''],
])('labels days=%s sessions=%s as %s', (days, sessions, expected) => {
  expect(joinPackageLabel({ days, sessions }, 'ar', createT(homeMessages, 'ar'))).toBe(expected);
});
it('omits a missing package and formats numbers with the requested locale', () => {
  expect(joinPackageLabel(undefined, 'ar', createT(homeMessages, 'ar'))).toBe('');
  expect(joinPackageLabel({ days: null, sessions: 1200 }, 'en', createT(homeMessages, 'en'))).toBe('1,200 sessions');
});
it.each([[30, null, '1 month'], [90, null, '3 months'], [1, null, '1 day'], [45, null, '45 days'],
  [null, 1, '1 session'], [null, 12, '12 sessions']])('labels English days=%s sessions=%s', (days, sessions, expected) => {
  expect(joinPackageLabel({ days, sessions }, 'en', createT(homeMessages, 'en'))).toBe(expected);
});
it('uses the standard Arabic dictionary', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(joinPackageLabel({ days: 90, sessions: null }, 'ar', createT(homeMessages, 'ar', 'standard'))).toBe('3 أشهر');
});
