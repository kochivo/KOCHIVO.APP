import { beforeEach, expect, it, vi } from 'vitest';
import { setLocale } from './set-locale';

const state = vi.hoisted(() => ({ user: 'player' as string | null, error: null as Error | null,
  saved: [] as { id: string; locale: string }[], cookies: [] as string[] }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: state.user ? { claims: { sub: state.user } } : null }) },
  from: (table: string) => {
    if (table !== 'profiles') throw new Error('Unexpected table');
    return { update: ({ locale }: { locale: string }) => ({ eq: async (column: string, id: string) => {
      if (column !== 'id') throw new Error('Missing ownership filter');
      if (!state.error) state.saved.push({ id, locale });
      return { error: state.error };
    } }) };
  },
}) }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: (_key: string, value: string) => state.cookies.push(value) }) }));
beforeEach(() => { state.user = 'player'; state.error = null; state.saved = []; state.cookies = []; });

it('persists a signed-in language choice for push delivery and updates the browser cookie', async () => {
  await setLocale('en'); await setLocale('ar');
  expect(state.saved).toEqual([{ id: 'player', locale: 'en' }, { id: 'player', locale: 'ar' }]);
  expect(state.cookies).toEqual(['en', 'ar']);
});
it('keeps signed-out language changes cookie-only and rejects invalid values', async () => {
  state.user = null;
  await setLocale('en'); await expect(setLocale('fr')).rejects.toThrow('Invalid locale');
  expect(state.saved).toEqual([]); expect(state.cookies).toEqual(['en']);
});
it('does not silently change the cookie when saving the profile fails', async () => {
  state.error = new Error('Save failed');
  await expect(setLocale('en')).rejects.toThrow('Save failed');
  expect(state.cookies).toEqual([]);
});
