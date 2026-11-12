import { expect, it } from 'vitest';
import { sendWorkspaceReview } from './workspace-send';
import type { WorkspaceInboxData, WorkspaceItem } from './workspace-types';
const at = new Date('2026-11-12T10:00:00Z');
const current: WorkspaceItem = { kind: 'checkin', id: '1', player_id: 'a', player_name: 'Ali', created_at: at.toISOString(),
  reviewed_at: null, reply: null, week_start: '2026-11-07', body_weight_kg: null, waist_cm: null, notes: null };
const next: WorkspaceItem = { kind: 'assessment', id: '1', player_id: 'b', player_name: 'Mona', title: 'Weekly',
  created_at: at.toISOString(), reviewed_at: null, reply: null, answers: [] };
const data: WorkspaceInboxData = { items: [current, next], triage: { history: [], dailyChecks: [] }, at: at.toISOString(), more: false, limit: 50,
  counts: { all: 2, checkin: 1, assessment: 1, request: 0, form: 0 } };
it('marks the current task optimistically and opens the next kind after commit succeeds', async () => {
  let committed = false;
  const selected = await sendWorkspaceReview({ data, visible: data.items, current, reply: '  Great  ', advance: true, now: at,
    mutate: async (update, commit) => {
      expect(update(data).items[0]).toMatchObject({ reply: 'Great', reviewed_at: at.toISOString() });
      expect(update(data).counts).toEqual({ all: 1, checkin: 0, assessment: 1, request: 0, form: 0 });
      await commit(); return true;
    }, review: async (item, reply) => { expect(item).toEqual(current); expect(reply).toBe('  Great  '); committed = true; }, failure: 'failed' });
  expect(committed).toBe(true);
  expect(selected).toEqual(next);
});
it('does not advance after a failed mutation and allows retrying the same reply', async () => {
  const input = { data, visible: data.items, current, reply: 'Keep this draft', advance: true, now: at, review: async () => {}, failure: 'failed' };
  await expect(sendWorkspaceReview({ ...input, mutate: async () => false })).rejects.toThrow('failed');
  expect(await sendWorkspaceReview({ ...input, mutate: async (_, commit) => { await commit(); return true; } })).toEqual(next);
});
it('closes on send-only and returns null when the final task is reviewed', async () => {
  const input = { data, current, reply: '', now: at, mutate: async (_: unknown, commit: () => Promise<void>) => { await commit(); return true; }, review: async () => {}, failure: 'failed' };
  expect(await sendWorkspaceReview({ ...input, visible: data.items, advance: false })).toBeNull();
  expect(await sendWorkspaceReview({ ...input, visible: [current], advance: true })).toBeNull();
});
