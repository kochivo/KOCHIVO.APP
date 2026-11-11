import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mediaUrls, reviewItem } from '@/features/inbox';
import { createResourceStore } from '@/core/resource/store';
import { sendFormReview } from './review';
import type { PlayerForm } from './adapter';

const mocks = vi.hoisted(() => ({ client: vi.fn(), select: vi.fn(), update: vi.fn(), eq: vi.fn(), sign: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: mocks.client }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'en', getT: async () => (key: string) => key }));
const now = new Date('2026-11-11T12:00:00Z');
const id = '019a0000-0000-7000-8000-000000000001';
const form: PlayerForm = { snapshot: { source: { kind: 'checkin', id, at: '2026-11-10T12:00:00Z' }, facts: {} },
  comparison: [], reviewedAt: null, reply: null, photoCount: 3, bodyFat: null };
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());

it.each([false, true])('uses the existing review action and rolls back a failed write: %s', async failed => {
  const query = { update: mocks.update, eq: mocks.eq, select: mocks.select };
  mocks.update.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
  let finish: (value: { data: { id: string }[]; error: Error | null }) => void = () => {};
  mocks.select.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const from = vi.fn(() => query);
  mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'captain' } } }) }, from });
  const store = createResourceStore({ now: () => now.getTime() });
  await store.retry('forms', async () => [form]);
  const toast = { error: vi.fn(), success: vi.fn() };
  const sending = sendFormReview({ form, reply: 'Reply', now, review: reviewItem, toast, failure: 'Failed', success: 'Sent',
    mutate: (next, commit) => store.mutate('forms', next, commit) });
  expect(store.read<PlayerForm[]>('forms').data?.[0]).toMatchObject({ reply: 'Reply', reviewedAt: now.toISOString() });
  await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ captain_reply: 'Reply', reviewed_at: now.toISOString() }));
  expect(from).toHaveBeenCalledWith('check_ins');
  expect(mocks.eq.mock.calls).toEqual([['id', id], ['captain_id', 'captain']]);
  finish({ data: failed ? [] : [{ id }], error: failed ? new Error('offline') : null });
  expect(await sending).toBe(!failed);
  if (failed) {
    expect(store.read<PlayerForm[]>('forms').data).toEqual([form]);
    expect(toast.error).toHaveBeenCalledWith('Failed');
  } else expect(toast.success).toHaveBeenCalledWith('Sent');
});

it('signs the selected check-in photos together through the existing media action', async () => {
  const paths = ['player/front.jpg', 'player/side.jpg', 'player/back.jpg'];
  const signed = paths.map(path => ({ path, signedUrl: `https://example.com/${path}` }));
  const query = { select: mocks.select, eq: mocks.eq, single: async () => ({ data: { photo_paths: paths }, error: null }) };
  mocks.select.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
  mocks.sign.mockResolvedValue({ data: signed, error: null });
  const bucket = vi.fn(() => ({ createSignedUrls: mocks.sign }));
  mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'captain' } } }) },
    from: () => query, storage: { from: bucket } });
  expect(await mediaUrls({ kind: 'checkin', id })).toEqual({ data: signed.map(file => file.signedUrl) });
  expect(bucket).toHaveBeenCalledWith('checkin-photos');
  expect(mocks.sign).toHaveBeenCalledExactlyOnceWith(paths, 600);
  expect(mocks.eq).toHaveBeenCalledWith('captain_id', 'captain');
});
