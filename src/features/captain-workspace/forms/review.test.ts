import { expect, it, vi } from 'vitest';
import { createResourceStore } from '@/core/resource/store';
import { sendFormReview } from './review';
import { adaptForms } from './adapter';
import { createReviewLock } from './review-lock';
import type { PlayerForm } from './adapter';
import type { Tables } from '@/types/database';

const row: Tables<'check_ins'> = { id: 'checkin', created_at: '2026-11-11T12:00:00Z',
  player_id: 'player', captain_id: 'captain', body_weight_kg: 82, waist_cm: null, body_fat_pct: null,
  notes: null, photo_paths: [], photo_poses: [], week_start: '2026-11-07', reviewed_at: null, captain_reply: null };
it.each(['returned error', 'rejection', 'success'])('calls the review action optimistically and handles %s', async outcome => {
  const store = createResourceStore({ now: () => 0 });
  const forms = adaptForms(null, [row], '2026-11-11');
  const form = forms[0];
  if (!form) throw new Error('Expected check-in fixture');
  await store.retry('forms', async () => forms);
  let resolve: (value: { data?: true; error?: string }) => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const review = vi.fn(() => new Promise<{ data?: true; error?: string }>((yes, no) => { resolve = yes; reject = no; }));
  const toast = { error: vi.fn(), success: vi.fn() };
  const mutate = (next: (current: PlayerForm[] | undefined) => PlayerForm[], commit: () => Promise<unknown>) => store.mutate('forms', next, commit);
  const sending = sendFormReview({ form, reply: 'Good work', now: new Date('2026-11-11T13:00:00Z'),
    mutate, review, toast, failure: 'Failed', success: 'Sent' });
  expect(review).toHaveBeenCalledWith({ kind: 'checkin', id: 'checkin', reply: 'Good work' });
  expect(store.read<PlayerForm[]>('forms').data?.[0]).toMatchObject({ reply: 'Good work', reviewedAt: '2026-11-11T13:00:00.000Z' });
  if (outcome === 'rejection') reject(new Error('offline'));
  else resolve(outcome === 'success' ? { data: true } : { error: 'Denied' });
  expect(await sending).toBe(outcome === 'success');
  if (outcome === 'success') expect(toast.success).toHaveBeenCalledWith('Sent');
  else {
    expect(store.read<PlayerForm[]>('forms').data).toEqual(forms);
    expect(toast.error).toHaveBeenCalledWith('Failed');
  }
});
it('keeps two forms consistent when another selection tries to review during a failed request', async () => {
  const store = createResourceStore({ now: () => 0 });
  const lock = createReviewLock();
  const forms = adaptForms(null, [row, { ...row, id: 'second' }], '2026-11-11');
  const first = forms.find(form => form.snapshot.source.id === 'checkin');
  const second = forms.find(form => form.snapshot.source.id === 'second');
  if (!first || !second) throw new Error('Expected two forms');
  await store.retry('forms', async () => forms);
  let finish: (value: { error: string }) => void = () => {};
  const failedReview = vi.fn(() => new Promise<{ error: string }>(resolve => { finish = resolve; }));
  const secondReview = vi.fn(async () => ({ data: true as const }));
  const mutate = (next: (current: PlayerForm[] | undefined) => PlayerForm[], commit: () => Promise<unknown>) =>
    lock.run(() => store.mutate('forms', next, commit));
  const common = { now: new Date('2026-11-11T13:00:00Z'), mutate, toast: { error: vi.fn(), success: vi.fn() }, failure: 'Failed', success: 'Sent' };
  const pending = sendFormReview({ ...common, form: first, reply: 'First', review: failedReview });
  expect(await sendFormReview({ ...common, form: second, reply: 'Second', review: secondReview })).toBe(false);
  expect(secondReview).not.toHaveBeenCalled();
  finish({ error: 'offline' });
  expect(await pending).toBe(false);
  expect(store.read<PlayerForm[]>('forms').data).toEqual(forms);
  expect(await sendFormReview({ ...common, form: second, reply: 'Second', review: secondReview })).toBe(true);
  expect(store.read<PlayerForm[]>('forms').data?.find(form => form.snapshot.source.id === first.snapshot.source.id)?.reviewedAt).toBeNull();
});
it('rolls back even when navigation unsubscribes before the review fails', async () => {
  const store = createResourceStore({ now: () => 0 });
  const forms = adaptForms(null, [row], '2026-11-11');
  const form = forms[0];
  if (!form) throw new Error('Expected form');
  await store.retry('forms', async () => forms);
  const unsubscribe = store.subscribe('forms', async () => forms, { staleMs: Infinity }, () => {});
  let finish: (value: { error: string }) => void = () => {};
  const review = () => new Promise<{ error: string }>(resolve => { finish = resolve; });
  const toast = { error: vi.fn(), success: vi.fn() };
  const sending = sendFormReview({ form, reply: 'Reply', now: new Date('2026-11-11T13:00:00Z'), review, toast,
    failure: 'Failed', success: 'Sent', mutate: (next, commit) => store.mutate('forms', next, commit) });
  unsubscribe();
  finish({ error: 'offline' });
  expect(await sending).toBe(false);
  const stop = store.subscribe('forms', async () => forms, { staleMs: Infinity }, () => {});
  expect(store.read<PlayerForm[]>('forms').data).toEqual(forms);
  expect(toast.error).toHaveBeenCalledWith('Failed');
  stop();
});
it('does not replace a newer authoritative review when reconciling an old failure', async () => {
  const store = createResourceStore({ now: () => 0 });
  const forms = adaptForms(null, [row], '2026-11-11');
  const form = forms[0];
  if (!form) throw new Error('Expected form');
  await store.retry('forms', async () => forms);
  let finish: (value: { error: string }) => void = () => {};
  const sending = sendFormReview({ form, reply: 'Old attempt', now: new Date('2026-11-11T13:00:00Z'),
    review: () => new Promise<{ error: string }>(resolve => { finish = resolve; }),
    toast: { error: vi.fn(), success: vi.fn() }, failure: 'Failed', success: 'Sent',
    mutate: (next, commit) => store.mutate('forms', next, commit) });
  const newer = [{ ...form, reply: 'Newer review', reviewedAt: '2026-11-11T14:00:00Z' }];
  await store.mutate('forms', () => newer, async () => {});
  finish({ error: 'offline' });
  expect(await sending).toBe(false);
  expect(store.read<PlayerForm[]>('forms').data).toEqual(newer);
});
