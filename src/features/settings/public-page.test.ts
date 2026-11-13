import { beforeEach, expect, it, vi } from 'vitest';
import { publicPageSchema } from './public-page-schema';
import { savePublicPage } from './data/public-page';
const mock = vi.hoisted(() => ({ update: vi.fn(), role: 'captain', auth: true, error: false }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: mock.auth ? { id: 'captain' } : null }, error: null }) },
  from: () => ({ update: mock.update, select() { return this; }, eq() { return this; },
    single: async () => ({ data: { role: mock.role }, error: null }) }),
}) }));
const input = { specialties: ['تنشيف'], years_experience: 0, languages: ['ar'], show_public_stats: true };
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); mock.update.mockReset(); mock.auth = true; mock.role = 'captain'; mock.error = false;
  const result = { eq: () => result, select: () => result, single: async () => ({ data: mock.error ? null : { id: 'captain' }, error: mock.error ? {} : null }) };
  mock.update.mockReturnValue(result);
});
it('validates all public fields and rejects invalid bounds or languages', () => {
  expect(publicPageSchema.safeParse(input).success).toBe(true);
  for (const patch of [{ specialties: ['a'] }, { specialties: Array<string>(7).fill('Valid') }, { years_experience: 61 }, { years_experience: 1.5 }, { languages: ['fr'] }])
    expect(publicPageSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  expect(publicPageSchema.safeParse({ ...input, years_experience: null }).success).toBe(true);
});
it('gates server writes and requires an authenticated captain', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(await savePublicPage(input)).toEqual({ ok: false });
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); mock.auth = false;
  expect(await savePublicPage(input)).toEqual({ ok: false });
  mock.auth = true; mock.role = 'player';
  expect(await savePublicPage(input)).toEqual({ ok: false });
  expect(mock.update).not.toHaveBeenCalled();
});
it('saves only validated fields and reports database failures', async () => {
  expect(await savePublicPage({ ...input, role: 'admin' })).toEqual({ ok: true });
  expect(mock.update).toHaveBeenCalledWith(input);
  mock.error = true;
  expect(await savePublicPage(input)).toEqual({ ok: false });
});
