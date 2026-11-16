import { beforeEach, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { mergeStrength, readRemoteStrength, readStrength } from './data/strength';

const state = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/core/offline', () => ({ localDb: () => ({ userId: 'player',
  set_logs: { toArray: async () => [{ id: 'same', exercise_id: 'lift', session_id: 'session', weight_kg: 110, reps: 8, deleted_at: null }] },
  workout_sessions: { toArray: async () => [{ id: 'session', training_date: '2026-11-16' }] },
}) }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => createClient<AppDatabase>('https://example.test', 'test-key', {
  global: { fetch: state.fetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) }));
beforeEach(() => { state.fetch.mockReset(); vi.unstubAllGlobals(); });

it('uses the newest timestamp for server corrections and tombstones', () => {
  const row = { id: 'same', exercise_id: 'lift', training_date: '2026-11-16', weight_kg: 100, reps: 8,
    deleted_at: null, client_updated_at: '2026-11-15' };
  expect(mergeStrength([row], [{ ...row, weight_kg: 120, client_updated_at: '2026-11-16' }])[0]?.weight_kg).toBe(120);
  expect(mergeStrength([row], [{ ...row, deleted_at: '2026-11-16', client_updated_at: '2026-11-16' }])).toEqual([]);
});

it('merges device history by id with local edits and deletions winning', () => {
  const row = { id: 'same', exercise_id: 'lift', training_date: '2026-11-16', weight_kg: 100, reps: 8, deleted_at: null, drop_index: 0 };
  const remote = [row, { ...row, id: 'remote' }, { ...row, id: 'deleted' }];
  const local = [{ ...row, weight_kg: 105 }, { ...row, id: 'local' }, { ...row, id: 'deleted', deleted_at: '2026-11-16T10:00:00Z' }];
  expect(mergeStrength(local, remote).map(set => set.weight_kg)).toEqual([105, 100, 100]);
  expect(mergeStrength([], remote)).toHaveLength(3);
  expect(mergeStrength(local, [])).toHaveLength(2);
  expect(mergeStrength([{ ...row, drop_index: 1 }], remote)).toHaveLength(2);
});

it('keeps remote-only lifts on a new device and uses local edits in the chart', async () => {
  const remote = [{ id: 'same', exercise_id: 'lift', training_date: '2026-11-15', weight_kg: 100, reps: 8, deleted_at: null, name_en: 'Press' },
    { id: 'remote', exercise_id: 'squat', training_date: '2026-11-14', weight_kg: 120, reps: 6, deleted_at: null, name_en: 'Squat' }];
  expect(await readStrength(null, 'en', remote)).toEqual({ names: { lift: 'Press', squat: 'Squat' }, sets: [
    { exercise_id: 'lift', training_date: '2026-11-16', weight_kg: 110, reps: 8 },
    { exercise_id: 'squat', training_date: '2026-11-14', weight_kg: 120, reps: 6 },
  ] });
});
it('paginates remote sets with a player filter and reads session dates and exercise names', async () => {
  const row = { id: 'remote', exercise_id: 'lift', weight_kg: 100, reps: 8, deleted_at: null, drop_index: 0,
    workout_sessions: { training_date: '2026-11-16' }, exercises: { name_ar: null, name_en: 'Press' } };
  state.fetch.mockResolvedValueOnce(new Response(JSON.stringify(Array.from({ length: 500 }, (_, id) => ({ ...row, id: String(id) }))), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify([row]), { status: 200 }));
  const rows = await readRemoteStrength();
  expect(rows).toHaveLength(501);
  expect(rows.at(-1)).toMatchObject({ training_date: '2026-11-16', name_en: 'Press' });
  const urls = state.fetch.mock.calls.map(call => new URL(String(call[0])));
  expect(urls[0]?.searchParams.get('player_id')).toBe('eq.player');
  expect(urls[1]?.searchParams.get('offset')).toBe('500');
});
it('uses local history offline and propagates remote errors to the retry state', async () => {
  vi.stubGlobal('navigator', { onLine: false });
  expect(await readRemoteStrength()).toEqual([]);
  expect(state.fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  state.fetch.mockResolvedValue(new Response(JSON.stringify({ message: 'Denied' }), { status: 403 }));
  await expect(readRemoteStrength()).rejects.toMatchObject({ message: 'Denied' });
});
