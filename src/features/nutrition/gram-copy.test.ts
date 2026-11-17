import { expect, it, vi, afterEach } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

afterEach(() => vi.unstubAllEnvs());
it('uses grams rather than the currency abbreviation', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(createT(messages, 'ar')('g')).toBe('جم');
  expect(createT(messages, 'ar', 'standard')('g')).toBe('جم');
  expect(createT(messages, 'en')('g')).toBe('g');
});
