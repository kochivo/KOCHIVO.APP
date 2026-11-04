import { beforeEach, expect, it, vi } from 'vitest';
import { fetchMuscleVolume } from '../data/muscle-volume';

const read = vi.hoisted(() => ({ pages: vi.fn(), calls: [] as [string, ...unknown[]][] }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({
  from: (table: string) => {
    read.calls.push(['from', table]);
    const query = {
      select: (columns: string) => { read.calls.push(['select', columns]); return query; },
      eq: (key: string, value: unknown) => { read.calls.push(['eq', key, value]); return query; },
      is: (key: string, value: unknown) => { read.calls.push(['is', key, value]); return query; },
      gte: (key: string, value: unknown) => { read.calls.push(['gte', key, value]); return query; },
      lte: (key: string, value: unknown) => { read.calls.push(['lte', key, value]); return query; },
      gt: (key: string, value: unknown) => { read.calls.push(['gt', key, value]); return query; },
      order: (key: string) => { read.calls.push(['order', key]); return query; },
      limit: (count: number) => { read.calls.push(['limit', count]); return query; },
      then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => read.pages().then(resolve, reject),
    };
    return query;
  },
}) }));
const now = new Date('2026-11-04T10:00:00Z');
const log = { id: 'last-id', completed_at: '2026-11-02T10:00:00Z', deleted_at: null, reps: 8,
  exercises: { target: 'quads', body_part: 'upper legs' } };
beforeEach(() => { read.calls = []; read.pages.mockReset(); });
it('reads player-scoped valid logs with exercise metadata and all pages', async () => {
  read.pages.mockResolvedValueOnce({ data: Array.from({ length: 500 }, () => log), error: null })
    .mockResolvedValueOnce({ data: [{ ...log, id: 'next-id' }], error: null });
  const weeks = await fetchMuscleVolume('player-id', now);
  expect(weeks[3]?.regions.legs).toBe(501);
  expect(weeks[3]?.anterior).toBe(501);
  expect(read.calls).toContainEqual(['eq', 'player_id', 'player-id']);
  expect(read.calls).toContainEqual(['is', 'deleted_at', null]);
  expect(read.calls).toContainEqual(['gte', 'reps', 1]);
  expect(read.calls).toContainEqual(['select', 'id,completed_at,deleted_at,reps,exercises(target,body_part)']);
  expect(read.calls).toContainEqual(['gt', 'id', 'last-id']);
  expect(read.calls).toContainEqual(['lte', 'completed_at', '2026-11-04T10:00:00.000Z']);
});
it('propagates query failures for the error and retry UI', async () => {
  read.pages.mockResolvedValue({ data: null, error: new Error('Unavailable') });
  await expect(fetchMuscleVolume('player-id', now)).rejects.toThrow('Unavailable');
});
it('returns four empty weeks for a player without logs', async () => {
  read.pages.mockResolvedValue({ data: [], error: null });
  expect((await fetchMuscleVolume('player-id', now)).map(week => week.total)).toEqual([0, 0, 0, 0]);
});
