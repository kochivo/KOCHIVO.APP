import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadFreezeSettings, saveFreezeSettings } from './freeze-settings';

const state = vi.hoisted(() => ({
  write: vi.fn(), filter: vi.fn(), from: vi.fn(),
  row: null as { default_days: number | null } | null, error: false,
}));
vi.mock('./client', () => ({ captainClient: async () => ({ captainId: 'owner', client: {
  from: (table: string) => {
    state.from(table);
    const result = () => ({ data: state.row, error: state.error ? new Error('Unavailable') : null });
    const chain = {
      select: () => chain,
      eq: (key: string, value: string) => { state.filter(key, value); return chain; },
      maybeSingle: async () => result(), single: async () => result(),
      upsert: (value: unknown) => { state.write(value); return chain; },
    };
    return chain;
  },
} }) }));
beforeEach(() => {
  vi.clearAllMocks(); state.row = null; state.error = false;
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-17T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());
it('loads only the authenticated captain setting, treating a missing row as empty', async () => {
  expect(await loadFreezeSettings()).toEqual({ data: { default_days: null }, error: false });
  expect(state.filter).toHaveBeenCalledWith('captain_id', 'owner');
  state.row = { default_days: 8 };
  expect(await loadFreezeSettings()).toEqual({ data: { default_days: 8 }, error: false });
});
it.each([null, 0, 90])('saves a bounded or cleared value for the authenticated captain: %s', async days => {
  expect(await saveFreezeSettings(days)).toEqual({ error: false });
  expect(state.write).toHaveBeenCalledWith({ captain_id: 'owner', default_days: days, updated_at: '2026-11-17T12:00:00.000Z' });
});
it.each([-1, 91, 1.5, '7', undefined, { captain_id: 'other', default_days: 7 }])('rejects invalid settings before writing: %s', async days => {
  expect(await saveFreezeSettings(days)).toEqual({ error: true });
  expect(state.write).not.toHaveBeenCalled();
});
it('returns load and save failures for translated client feedback', async () => {
  state.error = true;
  expect(await loadFreezeSettings()).toEqual({ data: null, error: true });
  expect(await saveFreezeSettings(8)).toEqual({ error: true });
});
