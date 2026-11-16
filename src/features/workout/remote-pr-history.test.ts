import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { KochivoDB } from '@/core/offline';
import { prHistory, remotePrHistory } from './data/pr-history';
import { detectPr } from './pr';

const state = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => createClient<AppDatabase>('https://example.test', 'test', {
  global: { fetch: state.fetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) }));
const db = new KochivoDB('remote-pr-history', 'player');
beforeEach(async () => { await db.open(); });
const row = { id: 'old', session_id: 'old-session', program_exercise_id: 'prescription', exercise_id: 'bench',
  set_index: 1, drop_index: 0, weight_kg: 100, reps: 8, completed_at: '2026-11-14T10:00:00Z',
  client_updated_at: '2026-11-14T10:00:00Z', deleted_at: null };
afterEach(async () => { await db.delete(); state.fetch.mockReset(); vi.unstubAllGlobals(); });

it('respects another device record and newer tombstones using player-scoped server rows', async () => {
  await db.set_logs.put({ ...row, weight_kg: 50 });
  state.fetch.mockResolvedValue(new Response(JSON.stringify([{ ...row, client_updated_at: '2026-11-15T10:00:00Z' }]), { status: 200 }));
  const history = await prHistory(db, 'bench', 'current');
  expect(detectPr(history, { weight_kg: 60, reps: 8 })).toBeNull();
  const url = new URL(String(state.fetch.mock.calls[0]?.[0]));
  expect(url.searchParams.get('player_id')).toBe('eq.player');
  expect(url.searchParams.get('exercise_id')).toBe('eq.bench');
});
it('paginates baselines and keeps exclusions and deletions after merging', async () => {
  state.fetch.mockResolvedValueOnce(new Response(JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ ...row, id: String(i) }))), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify([{ ...row, id: 'excluded' }, { ...row, deleted_at: '2026-11-15' }]), { status: 200 }));
  expect(await prHistory(db, 'bench', 'excluded')).toHaveLength(500);
  expect(new URL(String(state.fetch.mock.calls[1]?.[0])).searchParams.get('offset')).toBe('500');
});
it('uses local baselines offline and rejects server errors instead of claiming a record', async () => {
  await db.set_logs.put(row);
  vi.stubGlobal('navigator', { onLine: false });
  expect(await prHistory(db, 'bench', '')).toEqual([row]);
  expect(state.fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  state.fetch.mockResolvedValue(new Response(JSON.stringify({ message: 'Denied' }), { status: 403 }));
  await expect(remotePrHistory(db)).rejects.toMatchObject({ message: 'Denied' });
});
