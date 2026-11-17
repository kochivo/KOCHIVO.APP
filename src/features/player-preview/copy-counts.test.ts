import { expect, it, vi, afterEach } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

afterEach(() => vi.unstubAllEnvs());
it('uses singular after eleven sets and complete preview copy in both Arabic styles', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  for (const style of ['egyptian', 'standard'] as const) {
    const t = createT(messages, 'ar', style);
    expect(t('sets', { n: 12, count: '12' })).toBe('12 مجموعة');
    expect(t('sets', { n: 3, count: '3' })).toBe('3 مجموعات');
    expect(t('readOnly')).toMatch(/هنا/);
  }
});
