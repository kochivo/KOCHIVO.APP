import { createClient } from '@supabase/supabase-js';
import { afterEach, expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { reviewRequest } from './data/request-actions';
import { formsAccess } from './data/access';

vi.mock('./data/access', () => ({ formsAccess: vi.fn() }));
vi.mock('server-only', () => ({}));
afterEach(() => vi.useRealTimers());
const captain = '00000000-0000-7000-8000-000000000001';
const request = '00000000-0000-7000-8000-000000000002';
it.each([true, false])('only reviews when the current relationship exists: %s', async linked => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
  const writes: unknown[] = [];
  const client = createClient<AppDatabase>('https://test.invalid', 'test', { global: { fetch: async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === 'PATCH') {
      writes.push(JSON.parse(String(init.body)));
      return Response.json({ id: request });
    }
    if (url.pathname.endsWith('/coach_clients')) {
      expect(url.searchParams.get('captain_id')).toBe(`eq.${captain}`);
      expect(url.searchParams.get('player_id')).toBe('eq.player');
      expect(url.searchParams.get('archived_at')).toBe('is.null');
      expect(url.searchParams.get('pending')).toBe('eq.false');
      return Response.json(linked ? { player_id: 'player' } : null);
    }
    return Response.json({ player_id: 'player' });
  } } });
  vi.mocked(formsAccess).mockResolvedValue({ client, captain });
  expect(await reviewRequest(request, 'Reply')).toEqual({ ok: linked });
  expect(writes).toEqual(linked ? [{ captain_reply: 'Reply', reviewed_at: '2026-11-03T10:00:00.000Z' }] : []);
});
