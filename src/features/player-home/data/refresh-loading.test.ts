import { afterEach, expect, it, vi } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { refreshSnapshot } from './refresh-snapshot';

const mocks = vi.hoisted(() => ({ load: vi.fn(() => { throw new Error('chunk unavailable'); }) }));
vi.mock('@/core/supabase/browser', () => {
  mocks.load();
  return {};
});
afterEach(() => vi.clearAllMocks());

it('does not load the remote client offline or for an injected fetch', async () => {
  const db = new KochivoDB('refresh-lazy-client');
  try {
    expect(await refreshSnapshot({ db, online: false })).toBe('offline');
    expect(await refreshSnapshot({ db, online: true, fetch: async () => null })).toBe('empty');
    expect(mocks.load).not.toHaveBeenCalled();
  } finally { await db.delete(); }
});

it('handles remote chunk failures through the existing error result', async () => {
  const db = new KochivoDB('refresh-lazy-failure');
  try {
    expect(await refreshSnapshot({ db, online: true })).toBe('error');
  } finally { await db.delete(); }
});
