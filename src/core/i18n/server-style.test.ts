import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ArabicStyle } from './locale';

const state = vi.hoisted(() => ({
  jar: new Map<string, string>(), language: 'ar-SA', style: null as ArabicStyle | null,
  timezone: 'Asia/Riyadh', getClaims: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (key: string) => state.jar.has(key) ? { value: state.jar.get(key) } : undefined }),
  headers: async () => ({ get: () => state.language }),
}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: state.getClaims },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: state.maybeSingle }) }) }),
}) }));
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1'); vi.clearAllMocks(); state.jar.clear();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key');
  state.style = null; state.timezone = 'Asia/Riyadh'; state.language = 'ar-SA';
  state.getClaims.mockResolvedValue({ data: { claims: { sub: 'owner' } } });
  state.maybeSingle.mockImplementation(async () => ({ data: { arabic_style: state.style, timezone: state.timezone } }));
});
afterEach(() => vi.unstubAllEnvs());
it('renders a manual cookie on the server without looking up the profile', async () => {
  state.jar.set('kochivo.arabic', 'standard');
  const { getT } = await import('./server');
  const t = await getT({ ar: { now: 'دلوقتي' }, en: { now: 'Now' }, arStd: { now: 'الآن' } }, 'ar');
  expect(t('now')).toBe('الآن'); expect(state.getClaims).not.toHaveBeenCalled();
});
it('uses the profile choice before automatic timezone defaults', async () => {
  state.style = 'standard'; state.timezone = 'Africa/Cairo';
  const { getArabicStyle } = await import('./server');
  expect(await getArabicStyle()).toBe('standard');
});
it('uses device hints when the profile has no choice', async () => {
  state.jar.set('kochivo.timezone', 'Africa%2FCairo');
  const { getArabicStyle } = await import('./server');
  expect(await getArabicStyle()).toBe('egyptian');
});
it('uses the Arabic Egypt request language before device hints are available', async () => {
  state.language = 'ar-EG,ar;q=0.9';
  const { getArabicStyle } = await import('./server');
  expect(await getArabicStyle()).toBe('egyptian');
});
it('does not access request data or profiles when disabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  const { getArabicStyle } = await import('./server');
  expect(await getArabicStyle()).toBe('egyptian'); expect(state.getClaims).not.toHaveBeenCalled();
});
