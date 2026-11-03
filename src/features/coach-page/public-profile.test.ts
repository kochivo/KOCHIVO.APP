import { beforeEach, expect, it, vi } from 'vitest';
import { loadPublicCoach } from './data/public-profile';
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc: mock.rpc,
  storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example/${path}` } }) }) },
}) }));
beforeEach(() => vi.resetAllMocks());
it('returns null for unknown slugs but propagates outages to the error boundary', async () => {
  mock.rpc.mockResolvedValue({ data: [], error: null });
  expect(await loadPublicCoach('unknown')).toBeNull();
  mock.rpc.mockResolvedValue({ data: null, error: { code: 'network_error' } });
  await expect(loadPublicCoach('unavailable')).rejects.toMatchObject({ code: 'network_error' });
});
it('rejects malformed slugs before querying and only renders owned avatar paths', async () => {
  expect(await loadPublicCoach('admin')).toBeNull(); expect(mock.rpc).not.toHaveBeenCalled();
  const row = { id: 'captain', full_name: 'Ali', bio: null, location: null, social: {}, avatar_path: 'captain/photo.webp' };
  mock.rpc.mockResolvedValue({ data: [row], error: null });
  expect((await loadPublicCoach('ali'))?.avatar).toBe('https://storage.example/captain/photo.webp');
  mock.rpc.mockResolvedValue({ data: [{ ...row, avatar_path: 'other/photo.webp' }], error: null });
  expect((await loadPublicCoach('other'))?.avatar).toBeNull();
});
