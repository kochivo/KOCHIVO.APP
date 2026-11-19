import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { KochivoDB } from '@/core/offline';
import { refreshMealLogs } from './refresh-meal-logs';

const state = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: state.load }));
it('fetches only the authenticated player and requested date, including remote unticks and swaps', async () => {
  const db = new KochivoDB('meal-log-query');
  vi.stubGlobal('navigator', { onLine: true });
  const urls: URL[] = [];
  const at = '2026-11-16T10:00:00Z';
  const client = createClient<AppDatabase>('https://test.invalid', 'test', { global: { fetch: async input => {
    const url = new URL(String(input)); urls.push(url);
    return Response.json([{ id: 'log', meal_id: 'meal', player_id: 'player', log_date: '2026-11-16',
      swaps: { item: 'alt' }, completed_at: null, deleted_at: at, client_updated_at: at },
    { id: 'removed', meal_id: null, log_date: '2026-11-16', swaps: {}, completed_at: at, deleted_at: null,
      client_updated_at: at, eaten_macros: { kcal: 500, protein: 25, carbs: 60, fat: 18 } }]);
  } } });
  vi.spyOn(client.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'player' } }, error: null } as Awaited<ReturnType<typeof client.auth.getUser>>);
  state.load.mockResolvedValue(client);
  try {
    await refreshMealLogs('2026-11-16', db);
    expect(urls[0]?.searchParams.get('player_id')).toBe('eq.player');
    expect(urls[0]?.searchParams.get('log_date')).toBe('eq.2026-11-16');
    expect(urls[0]?.searchParams.has('deleted_at')).toBe(false);
    expect(await db.meal_logs.toArray()).toMatchObject([{ swaps: { item: 'alt' }, completed_at: null, deleted_at: at },
      { meal_id: null, eaten_macros: { kcal: 500 } }]);
    vi.stubGlobal('navigator', { onLine: false });
    await refreshMealLogs('2026-11-17', db);
    expect(urls).toHaveLength(1);
  } finally { await db.delete(); vi.unstubAllGlobals(); }
});
