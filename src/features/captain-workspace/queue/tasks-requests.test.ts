import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { customFormRows } from './data/custom-forms';
import { buildTasks } from './tasks-model';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/captain-workspace-enabled', () => ({ captainWorkspaceEnabled: () => true }));

it('keeps sent-but-unanswered requests out until answered and excludes reviewed or other-captain requests', async () => {
  const at = '2026-11-14T10:00:00Z';
  const rows = [
    { id: 'answered', answered_at: at, reviewed_at: null, captain_id: 'captain' },
    { id: 'sent', answered_at: null, reviewed_at: null, captain_id: 'captain' },
    { id: 'reviewed', answered_at: at, reviewed_at: at, captain_id: 'captain' },
    { id: 'other', answered_at: at, reviewed_at: null, captain_id: 'other' },
  ].map(row => ({ ...row, player_id: 'p', captain_reply: null, profiles: { full_name: 'Player' },
    forms: { title: 'Assessment' }, form_answers: [] }));
  type Row = typeof rows[number];
  const filters: ((row: Row) => boolean)[] = [];
  const query = {
    select: () => query, order: () => query, limit: () => query,
    eq: (key: keyof Row, value: unknown) => { filters.push(row => row[key] === value); return query; },
    is: (key: keyof Row, value: unknown) => { filters.push(row => row[key] === value); return query; },
    not: (key: keyof Row, _operator: string, value: unknown) => { filters.push(row => row[key] !== value); return query; },
    then: (resolve: (result: { data: Row[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: rows.filter(row => filters.every(filter => filter(row))), error: null })),
  };
  const client = { from: () => query } as unknown as SupabaseClient<AppDatabase>;
  const result = await customFormRows(client, 'captain');
  // Sent requests wait for a player answer; they are not captain review work yet.
  expect(buildTasks(result.items, [], [], new Date(at), 'Africa/Cairo').map(task => task.id)).toEqual(['request:answered']);
  expect(result.cursor).toBeNull();
});
