import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { applyDecisionAt } from './data/decision-internal';

const writes = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en') }));
vi.mock('@/core/timezone/server', () => ({ getPlayerTimezone: async () => 'Asia/Dubai' }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'captain' } } }) },
  from: () => ({ upsert: async (row: Record<string, unknown>) => { writes.rows.push(row); return { error: null }; } }),
}) }));
afterEach(() => { writes.rows = []; });
it('saves a captain decision for the player day around midnight', async () => {
  await applyDecisionAt('player', 'reduce', new Date('2026-01-01T21:30:00Z'));
  expect(writes.rows).toEqual([expect.objectContaining({ player_id: 'player', decision_date: '2026-01-02', decision: 'reduce' })]);
});
