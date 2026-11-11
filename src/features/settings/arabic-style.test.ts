import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), setLocale: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/set-locale', () => ({ setLocale: state.setLocale }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
  from: () => ({ update: state.update }),
}) }));
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  state.update.mockReturnValue({ eq: state.eq }); state.eq.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());
it('saves the selected Arabic style to the owner profile before setting cookies', async () => {
  const { saveLanguage } = await import('./data/language');
  await saveLanguage({ locale: 'ar', style: 'standard', label: 'arabicStandard' });
  expect(state.update).toHaveBeenCalledWith({ arabic_style: 'standard' });
  expect(state.eq).toHaveBeenCalledWith('id', 'owner');
  expect(state.setLocale).toHaveBeenCalledWith('ar', 'standard');
});
it('leaves cookies unchanged if the profile write fails', async () => {
  const { saveLanguage } = await import('./data/language');
  state.eq.mockResolvedValue({ error: { message: 'failed' } });
  await expect(saveLanguage({ locale: 'ar', style: 'standard', label: 'arabicStandard' })).rejects.toThrow();
  expect(state.setLocale).not.toHaveBeenCalled();
});
it('keeps the legacy cookie-only path with the flag off', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  const { saveLanguage } = await import('./data/language');
  await saveLanguage({ locale: 'ar', style: 'standard', label: 'arabicStandard' });
  expect(state.update).not.toHaveBeenCalled();
  expect(state.setLocale).toHaveBeenCalledWith('ar');
});
