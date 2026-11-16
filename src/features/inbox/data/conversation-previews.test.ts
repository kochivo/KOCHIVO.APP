import { expect, it, vi } from 'vitest';
import { loadConversationPreviews } from './conversation-previews';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ rpc }) }));
const players = ['text', 'voice', 'empty'].map(playerId => ({ playerId, fullName: playerId,
  accessUntil: '2026-12-01', startedOn: '2026-11-01', lastTrainingDate: null, programTitle: null, openTasks: 0 }));
it('loads all previews with one RPC and never requests signed audio', async () => {
  rpc.mockResolvedValueOnce({ error: null, data: [
    { player_id: 'text', id: 'a', kind: 'text', body: 'Hello', created_at: '2026-11-01T10:00:00Z', sender_id: 'captain', duration_seconds: null, unread_count: 0 },
    { player_id: 'voice', id: 'b', kind: 'voice', body: null, created_at: '2026-11-02T10:00:00Z', sender_id: 'voice', duration_seconds: 12, unread_count: 2 },
  ] });
  const rows = await loadConversationPreviews({ players, captainId: 'captain', at: '2026-11-03T10:00:00Z' });
  expect(rpc).toHaveBeenCalledExactlyOnceWith('inbox_previews');
  expect(rows[0]?.latest).toMatchObject({ kind: 'text', body: 'Hello', mine: true });
  expect(rows[1]).toMatchObject({ unread: 2, latest: { kind: 'voice', durationSeconds: 12, mine: false } });
  expect(rows[1]?.latest?.url).toBeUndefined();
  expect(rows[2]).toEqual({ player: players[2], latest: undefined, unread: 0 });
});
it('propagates RPC failures for the retry state', async () => {
  rpc.mockResolvedValueOnce({ data: null, error: new Error('offline') });
  await expect(loadConversationPreviews({ players, captainId: 'captain', at: '' })).rejects.toThrow('offline');
});
