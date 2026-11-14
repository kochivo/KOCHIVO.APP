import { beforeEach, expect, it, vi } from 'vitest';
import { loadCaptainFrame } from './captain-frame-data';

const state = vi.hoisted(() => ({ roster: vi.fn(), waiting: vi.fn(), chats: vi.fn(), joins: vi.fn(), profile: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }));
vi.mock('@/core/supabase/claims', () => ({ currentClaims: async () => ({ data: { claims: { sub: 'captain-id' } } }) }));
vi.mock('../data/roster', () => ({ fetchRoster: state.roster }));
vi.mock('../data/navigation-count', () => ({ fetchWaitingCount: state.waiting }));
vi.mock('@/features/chat/server', () => ({ unreadCounts: state.chats }));
vi.mock('../data/client', () => ({ rosterClient: async () => ({
  rpc: state.joins,
  from: () => ({ select: () => ({ eq: () => ({ single: state.profile }) }) }),
}) }));

beforeEach(() => {
  state.roster.mockResolvedValue({ players: [{ playerId: 'player-id', fullName: 'Real player' }] });
  state.waiting.mockResolvedValue(9);
  state.chats.mockResolvedValue({ 'player-id': 3, other: 2 });
  state.joins.mockResolvedValue({ data: [{ id: 'join1' }, { id: 'join2' }], error: null });
  state.profile.mockResolvedValue({ data: { full_name: 'Real captain', avatar_path: null }, error: null });
});

it('separates joins from open tasks and uses the complete unread message count', async () => {
  const data = await loadCaptainFrame();
  expect(data.counts).toEqual({ tasks: 7, inbox: 5, join: 2, billing: null });
  expect(data.players).toEqual([{ id: 'player-id', name: 'Real player' }]);
  expect(data.captain).toEqual({ name: 'Real captain', avatar: null });
});

it('does not turn failed chat, roster or profile reads into fictional zero values', async () => {
  state.chats.mockRejectedValue(new Error('Unavailable'));
  state.roster.mockResolvedValue({ error: 'Unavailable' });
  state.profile.mockResolvedValue({ data: null, error: new Error('Unavailable') });
  const data = await loadCaptainFrame();
  expect(data.counts.inbox).toBeNull();
  expect(data.counts.tasks).toBe(7);
  expect(data.players).toBeNull();
  expect(data.captain).toBeNull();
});

it('does not guess the task count when join counts fail', async () => {
  state.joins.mockResolvedValue({ data: null, error: new Error('Unavailable') });
  expect((await loadCaptainFrame()).counts).toMatchObject({ tasks: null, join: null });
});
