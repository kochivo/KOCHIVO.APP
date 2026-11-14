import { beforeEach, expect, it, vi } from 'vitest';
import { readTrainingPlayerFile } from './read-player-file';

const state = vi.hoisted(() => ({ scans: vi.fn(), tags: vi.fn(), from: vi.fn(), scanQuery: vi.fn(), tagQuery: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/features/player-file', () => ({ loadPlayerFile: async () => ({ facts: {}, history: [] }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ from: state.from }) }));
beforeEach(() => {
  vi.clearAllMocks();
  state.scans.mockResolvedValue({ data: [{ fat_pct: 19.5 }], error: null });
  state.tags.mockResolvedValue({ data: [], error: null });
  state.from.mockImplementation((table: string) => {
    const track = table === 'body_scans' ? state.scanQuery : state.tagQuery;
    const query = {
      select: (value: string) => { track('select', value); return query; },
      eq: (key: string, value: string) => { track('eq', key, value); return query; },
      not: (key: string, operator: string, value: null) => { track('not', key, operator, value); return query; },
      order: (key: string, options?: { ascending: boolean }) => { track('order', key, options); return query; },
      limit: (count: number) => { track('limit', count); return state.scans(); },
      range: (start: number, end: number) => { track('range', start, end); return state.tags(); },
    };
    return query;
  });
});
it('reads the newest nonempty body fat and generator stress with visible exercise metadata', async () => {
  const exercise = { id: 'e', name_ar: 'بنش', name_en: 'Bench', body_part: 'chest', equipment: 'barbell', media_path: null };
  state.tags.mockResolvedValue({ data: [{ exercise_id: 'e', pattern: 'h_push', stress: ['shoulder'], exercises: exercise }], error: null });
  expect(await readTrainingPlayerFile('player')).toEqual({ file: { facts: {}, history: [] }, fatPct: 19.5,
    candidates: [{ exercise_id: 'e', pattern: 'h_push', stress: ['shoulder'], library: exercise }],
  });
  expect(state.scanQuery).toHaveBeenCalledWith('eq', 'player_id', 'player');
  expect(state.scanQuery).toHaveBeenCalledWith('not', 'fat_pct', 'is', null);
  expect(state.scanQuery).toHaveBeenCalledWith('order', 'scan_date', { ascending: false });
  expect(state.scanQuery).toHaveBeenCalledWith('limit', 1);
});
it('keeps absent body fat explicit and reads tags beyond the first server page', async () => {
  state.scans.mockResolvedValue({ data: [], error: null });
  state.tags.mockResolvedValueOnce({ data: Array.from({ length: 500 }, () => ({
    exercise_id: 'e', pattern: 'core', stress: [], exercises: null,
  })), error: null });
  const result = await readTrainingPlayerFile('player');
  expect(result.fatPct).toBeNull();
  expect(result.candidates).toEqual([]);
  expect(state.tagQuery).toHaveBeenCalledWith('range', 500, 999);
});
it.each(['scans', 'tags'] as const)('propagates %s failures for the route retry state', async source => {
  state[source].mockResolvedValue({ data: null, error: new Error('Read failed') });
  await expect(readTrainingPlayerFile('player')).rejects.toThrow('Read failed');
});
