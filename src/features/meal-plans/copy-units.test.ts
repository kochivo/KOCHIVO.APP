import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { messages as v11 } from './components/v11/messages';
import { messages as calculator } from './components/calculator/messages';

afterEach(() => vi.unstubAllEnvs());
it('uses unambiguous grams across food views and handles zero players', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  for (const style of ['egyptian', 'standard'] as const) {
    const t = createT(messages, 'ar', style), v = createT(v11, 'ar', style);
    expect(t('g', { v0: 150 })).toBe('150 جم');
    expect(t('g2')).toBe('جم');
    expect(v('grams', { n: 150 })).toBe('150 جم');
    expect(v('usage', { n: 0 })).toBe(style === 'egyptian' ? 'مفيش لاعبين عليه' : 'لا يوجد لاعبون عليه');
    expect(createT(calculator, 'ar', style)('grams', { value: 150 })).toBe('150 جم');
  }
  expect(createT(v11, 'en')('grams', { n: 150 })).toBe('150g');
});
