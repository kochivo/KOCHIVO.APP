import { afterEach, expect, it, vi } from 'vitest';
import { languageOptions } from './language-options';
afterEach(() => vi.unstubAllEnvs());
it('preserves the two original options when disabled', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  expect(languageOptions()).toEqual([{ locale: 'ar', label: 'arabic' }, { locale: 'en', label: 'english' }]);
});
it('offers both Arabic styles on the same locale when enabled', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(languageOptions()).toEqual([
    { locale: 'ar', style: 'egyptian', label: 'arabicEgyptian' },
    { locale: 'ar', style: 'standard', label: 'arabicStandard' },
    { locale: 'en', label: 'english' },
  ]);
});
