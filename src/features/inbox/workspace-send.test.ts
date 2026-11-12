import { expect, it } from 'vitest';
import { sendWorkspaceReview } from './workspace-send';
import type { WorkspaceInboxData, WorkspaceItem } from './workspace-types';
import { createResourceStore } from '@/core/resource/store';
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
it('updates completion history and its clock after review without sending a saved draft', async () => {
  const withHistory = { ...data, weekAt: '2026-11-06T22:00:00Z', reviews: { total: 3, more: false, cursor: null } };
  await sendWorkspaceReview({ data: withHistory, visible: data.items, current, reply: '', advance: true, now: at,
    mutate: async (update, commit) => {
      expect(update(withHistory).reviews?.total).toBe(4);
      expect(update(withHistory).at).toBe(at.toISOString());
      expect(update(withHistory).items[0]).toMatchObject({ reply: null });
      await commit(); return true;
    }, review: async (_, reply) => { expect(reply).toBe(''); }, failure: 'failed' });
});
it('rolls back rows and exact status aggregates when the real resource commit fails', async () => {
  const store = createResourceStore({ now: () => at.getTime() });
  const initial: WorkspaceInboxData = { ...data, statusCounts: {
    overdue: { all: 0, checkin: 0, assessment: 0, form: 0, request: 0 },
    completed: { all: 200, checkin: 100, assessment: 100, form: 0, request: 0 },
  }, reviews: { total: 200, more: true, cursor: null } };
  await store.mutate('followup', () => initial, async () => {});
  await expect(sendWorkspaceReview({ data: initial, visible: initial.items, current, reply: 'Keep my draft', advance: true, now: at,
    mutate: (update, commit) => store.mutate('followup', update, commit), failure: 'failed', review: async () => {
      expect(store.read<WorkspaceInboxData>('followup').data?.statusCounts?.completed.all).toBe(201);
      throw new Error('network failure');
    } })).rejects.toThrow('failed');
  expect(store.read<WorkspaceInboxData>('followup').data).toEqual(initial);
});
