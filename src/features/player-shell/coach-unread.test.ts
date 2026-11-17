import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { CoachButton } from './components/coach-button-entry';

const state = vi.hoisted(() => ({
  load: undefined as (() => Promise<number>) | undefined,
  error: null as Error | null,
  count: 62,
  select: vi.fn(), eq: vi.fn(), neq: vi.fn(), is: vi.fn(), resource: vi.fn(),
}));
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('@/core/offline', () => ({ localDb: () => ({ userId: 'player' }) }));
vi.mock('./hooks/use-my-captain', () => ({ useCaptainContext: () => ({
  data: { captainId: 'coach', fullName: 'هشام' }, status: 'ready',
}) }));
vi.mock('@/core/resource', () => ({ useResource: (key: string, load: () => Promise<number>, options: unknown) => {
  state.load = load;
  state.resource(key, options);
  return { data: state.count, status: 'ready' };
} }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => {
  const query = {
    select: (...args: unknown[]) => { state.select(...args); return query; },
    eq: (...args: unknown[]) => { state.eq(...args); return query; },
    neq: (...args: unknown[]) => { state.neq(...args); return query; },
    is: (...args: unknown[]) => { state.is(...args); return Promise.resolve({ count: state.count, error: state.error }); },
  };
  return { from: (table: string) => { expect(table).toBe('chat_messages'); return query; } };
} }));
beforeEach(() => { vi.clearAllMocks(); state.error = null; });

it('connects the avatar badge to the full scoped chat unread count without loading a thread', async () => {
  const html = renderToStaticMarkup(createElement(CoachButton));
  expect(html).toContain('>62</span>');
  expect(await state.load?.()).toBe(62);
  expect(state.resource).toHaveBeenCalledWith('coach-unread:player:coach', { pollMs: 15000 });
  expect(state.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
  expect(state.eq.mock.calls).toEqual([['player_id', 'player'], ['captain_id', 'coach']]);
  expect(state.neq).toHaveBeenCalledWith('sender_id', 'player');
  expect(state.is).toHaveBeenCalledWith('read_at', null);
});

it('lets the resource report a count failure instead of reporting zero unread messages', async () => {
  renderToStaticMarkup(createElement(CoachButton));
  state.error = new Error('offline');
  await expect(state.load?.()).rejects.toThrow('offline');
});
