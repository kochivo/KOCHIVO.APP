import { afterEach, expect, it, vi } from 'vitest';
import { playerFormsAccess } from './data/player-access';

const state = vi.hoisted(() => ({ user: 'player' as string | null, role: 'player', suspended: null as string | null }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null }, error: null }) },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({
    error: null, data: { role: state.role, suspended_at: state.suspended },
  }) }) }) }),
}) }));
afterEach(() => { vi.unstubAllEnvs(); state.user = 'player'; state.role = 'player'; state.suspended = null; });
it('allows an active player to open a notification destination with workspace disabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(await playerFormsAccess()).toMatchObject({ player: 'player' });
});
it('still rejects missing sessions, captains and suspended players', async () => {
  state.user = null;
  await expect(playerFormsAccess()).rejects.toThrow('NOT_FOUND');
  state.user = 'player'; state.role = 'captain';
  await expect(playerFormsAccess()).rejects.toThrow('NOT_FOUND');
  state.role = 'player'; state.suspended = '2026-11-03T10:00:00Z';
  await expect(playerFormsAccess()).rejects.toThrow('NOT_FOUND');
});
