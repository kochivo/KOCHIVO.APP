import { afterEach, expect, it, vi } from 'vitest';
import { saveLanguage } from './data/language';

const state = vi.hoisted(() => ({ setLocale: vi.fn(), database: vi.fn() }));
vi.mock('@/core/i18n/set-locale', () => ({ setLocale: state.setLocale }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: state.database }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

it.each(['0', '1'])('saves only the locale with international=%s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', flag);
  await saveLanguage({ locale: 'ar', label: 'arabic' });
  expect(state.setLocale).toHaveBeenCalledExactlyOnceWith('ar');
  expect(state.database).not.toHaveBeenCalled();
});

it('propagates a failed cookie write', async () => {
  state.setLocale.mockRejectedValueOnce(new Error('failed'));
  await expect(saveLanguage({ locale: 'en', label: 'english' })).rejects.toThrow('failed');
});
