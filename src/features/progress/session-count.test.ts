import { createClient } from '@supabase/supabase-js';
import { beforeEach, expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { readRemoteSessionIds } from './components/progress-session-count';

const state = vi.hoisted(() => ({ fetch: vi.fn(), userId: 'player' as string | undefined }));
vi.mock('@/core/offline', () => ({ localDb: () => ({ userId: state.userId }) }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => createClient<AppDatabase>('https://example.test', 'test-key', {
  global: { fetch: state.fetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) }));
beforeEach(() => { state.fetch.mockReset(); state.userId = 'player'; vi.unstubAllGlobals(); });

it('paginates completed IDs with an explicit owner filter through the real Supabase client', async () => {
  const first = Array.from({ length: 500 }, (_, index) => ({ id: String(index) }));
  state.fetch.mockResolvedValueOnce(new Response(JSON.stringify(first), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'last' }]), { status: 200 }));
  const ids = await readRemoteSessionIds();
  expect(ids).toHaveLength(501);
  expect(ids.at(-1)).toBe('last');
  const urls = state.fetch.mock.calls.map(call => new URL(String(call[0])));
  expect(urls).toHaveLength(2);
  expect(urls[0]?.searchParams.get('player_id')).toBe('eq.player');
  expect(urls[0]?.searchParams.get('completed_at')).toBe('not.is.null');
  expect(urls[1]?.searchParams.get('offset')).toBe('500');
});
it('avoids a remote request offline and propagates read errors for the retry state', async () => {
  vi.stubGlobal('navigator', { onLine: false });
  expect(await readRemoteSessionIds()).toEqual([]);
  expect(state.fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  state.fetch.mockResolvedValue(new Response(JSON.stringify({ message: 'Denied' }), { status: 403 }));
  await expect(readRemoteSessionIds()).rejects.toMatchObject({ message: 'Denied' });
});
