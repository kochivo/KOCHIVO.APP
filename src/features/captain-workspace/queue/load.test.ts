import { beforeEach, expect, it, vi } from 'vitest';
import { loadQueue, mergeQueuePage, moreQueue } from './data/load';
import { loadQueuePage, loadQueueReviews, loadQueueTriage } from './data/page';
import type { QueuePage } from './data/page';
vi.mock('./data/page', () => ({ loadQueuePage: vi.fn(), loadQueueReviews: vi.fn(), loadQueueTriage: vi.fn() }));
vi.mock('./data/counts', () => ({ loadQueueCounts: async () => ({ needsReply: 1, late: 0, reviewed: 0, reviewedWeek: 0, all: 1 }) }));
const cursor = { created_at: '2026-11-10T10:00:00Z', id: 'boundary' };
const item = { kind: 'form' as const, id: 'one', player_id: 'p', player_name: 'Ahmed',
  created_at: '2026-11-10T10:00:00Z', reviewed_at: null, reply: null, exercise_name: 'Squat', note: null };
const first: QueuePage = { items: [item], previous: {}, cursor, renewalCursor: null, at: '2026-11-11T12:00:00Z' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadQueueReviews).mockResolvedValue([]);
  vi.mocked(loadQueueTriage).mockResolvedValue({ history: [], dailyChecks: [] });
});
it('loads the next cursor page, retains earlier requests and stops at exhaustion', async () => {
  vi.mocked(loadQueuePage).mockResolvedValueOnce(first).mockResolvedValueOnce({ ...first,
    items: [{ ...item, id: 'two' }], cursor: null });
  const initial = await loadQueue();
  const next = await moreQueue(initial);
  expect(next.pages.flatMap(page => page.items.map(row => row.id))).toEqual(['one', 'two']);
  expect(loadQueuePage).toHaveBeenLastCalledWith({ cursor, renewalCursor: undefined, skipInbox: false, skipRenewals: true });
  expect(await moreQueue(next)).toBe(next);
  expect(loadQueuePage).toHaveBeenCalledTimes(2);
});
it('retains the first page on a failed load-more so the same cursor can be retried', async () => {
  vi.mocked(loadQueuePage).mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('offline'));
  const data = await loadQueue();
  await expect(moreQueue(data)).rejects.toThrow('offline');
  expect(data.pages).toEqual([first]);
});
it('supports an empty initial page and surfaces initial failures', async () => {
  vi.mocked(loadQueuePage).mockResolvedValueOnce({ ...first, items: [], cursor: null }).mockRejectedValueOnce(new Error('offline'));
  expect((await loadQueue()).pages[0]?.items).toEqual([]);
  await expect(loadQueue()).rejects.toThrow('offline');
});
it('does not duplicate triage evidence when the same player appears on later pages', async () => {
  const history = [{ id: 'history', player_id: 'p', week_start: '2026-11-01', body_weight_kg: 80, waist_cm: null }];
  const dailyChecks = [{ player_id: 'p', log_date: '2026-11-10', sleep_hours: 5, soreness: 4, deleted_at: null }];
  vi.mocked(loadQueueTriage).mockResolvedValue({ history, dailyChecks });
  vi.mocked(loadQueuePage).mockResolvedValueOnce(first).mockResolvedValueOnce({ ...first, cursor: null });
  expect((await moreQueue(await loadQueue())).triage).toEqual({ history, dailyChecks });
});
it('preserves a review completed during pagination and ignores pages from a replaced snapshot', async () => {
  vi.mocked(loadQueuePage).mockResolvedValue(first);
  const initial = await loadQueue();
  const reviewed = { ...item, reviewed_at: '2026-11-11T12:01:00Z' };
  const current = { ...initial, reviews: [reviewed], counts: { ...initial.counts, needsReply: 0, reviewed: 1 } };
  const paged = { ...initial, pages: [...initial.pages, { ...first, cursor: null }] };
  expect(mergeQueuePage(current, paged)).toMatchObject({ reviews: [reviewed], counts: { needsReply: 0, reviewed: 1 }, pages: paged.pages });
  const refreshed = { ...current, pages: [{ ...first, at: '2026-11-11T12:02:00Z' }] };
  expect(mergeQueuePage(refreshed, paged)).toBe(refreshed);
});
it('loads existing review detail evidence for players who only have reviewed check-ins', async () => {
  vi.mocked(loadQueuePage).mockResolvedValue({ ...first, items: [], cursor: null });
  vi.mocked(loadQueueReviews).mockResolvedValue([{ ...item, kind: 'checkin', week_start: '2026-11-07',
    body_weight_kg: 80, waist_cm: 90, notes: null, reviewed_at: '2026-11-11T11:00:00Z' }]);
  await loadQueue();
  expect(loadQueueTriage).toHaveBeenCalledWith(['p'], first.at);
});
