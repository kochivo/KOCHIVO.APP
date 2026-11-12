import { expect, it } from 'vitest';
import { clearReplyDraft, replyDraft, saveReplyDraft } from './workspace-drafts';
import { sendWorkspaceReview } from './workspace-send';
import type { WorkspaceInboxData, WorkspaceItem } from './workspace-types';
const at = new Date('2026-11-12T10:00:00Z');
const first: WorkspaceItem = { kind: 'checkin', id: 'same', player_id: 'a', player_name: 'Ali', created_at: at.toISOString(),
  reviewed_at: null, reply: null, week_start: '2026-11-07', body_weight_kg: null, waist_cm: null, notes: null };
const second: WorkspaceItem = { kind: 'assessment', id: 'same', player_id: 'b', player_name: 'Mona', title: 'Weekly',
  created_at: at.toISOString(), reviewed_at: null, reply: null, answers: [] };
it('keeps a failed-send draft when switching away and returning, clearing it only after success', async () => {
  let drafts = saveReplyDraft({}, first, 'Keep this reply');
  const data: WorkspaceInboxData = { items: [first, second], triage: { history: [], dailyChecks: [] }, at: at.toISOString(), more: false, limit: 50 };
  const input = { data, visible: data.items, current: first, reply: replyDraft(drafts, first), advance: true, now: at, review: async () => {}, failure: 'failed' };
  await expect(sendWorkspaceReview({ ...input, mutate: async () => false })).rejects.toThrow('failed');
  drafts = saveReplyDraft(drafts, second, 'Another reply');
  expect(replyDraft(drafts, first)).toBe('Keep this reply');
  expect(replyDraft(drafts, second)).toBe('Another reply');
  expect(await sendWorkspaceReview({ ...input, mutate: async (_, commit) => { await commit(); return true; } })).toEqual(second);
  drafts = clearReplyDraft(drafts, first);
  expect(replyDraft(drafts, first)).toBe('');
  expect(replyDraft(drafts, second)).toBe('Another reply');
});
