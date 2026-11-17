import { expect, it, vi, afterEach } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

afterEach(() => vi.unstubAllEnvs());
it('uses Arabic number categories for program days and players', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  for (const style of ['egyptian', 'standard'] as const) {
    const t = createT(messages, 'ar', style);
    expect(t('dayCount', { n: 1, count: '1' })).toBe('يوم واحد');
    expect(t('programDays', { n: 1, count: '1' })).toBe('يوم واحد');
    expect(t('programDays', { n: 12, count: '12' })).toMatch(/^12 يوم/);
    expect(t('programPlayers', { n: 0, count: '0' })).toBe(style === 'egyptian' ? 'مفيش لاعبين عليه' : 'لا يوجد لاعبون عليه');
  }
  expect(createT(messages, 'en')('programDays', { n: 1, count: '1' })).toBe('1 day');
});
