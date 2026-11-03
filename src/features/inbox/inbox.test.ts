import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ageLabel, mergeInbox, quickReplies } from './merge';
import { mediaUrls } from './data/inbox';
import { reviewItemAt } from './data/inbox-internal';
import type { InboxItem } from './types';

const mocks = vi.hoisted(() => {
  const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() };
  const signing = { createSignedUrls: vi.fn() };
  return { query, signing, client: { from: vi.fn(), auth: { getUser: vi.fn() }, storage: { from: vi.fn() } }, server: vi.fn() };
});
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: mocks.server }));
const id = '019a0000-0000-7000-8000-000000000001';
const now = new Date('2026-11-03T12:00:00Z');
const reviewItem = (input: unknown) => reviewItemAt(input, now);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.server.mockResolvedValue(mocks.client);
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: 'captain' } }, error: null });
  mocks.client.from.mockReturnValue(mocks.query);
  mocks.query.update.mockReturnValue(mocks.query);
  mocks.query.eq.mockReturnValue(mocks.query);
  mocks.query.select.mockResolvedValue({ data: [{ id }], error: null });
  mocks.client.storage.from.mockReturnValue(mocks.signing);
});

describe('inbox logic', () => {
  it('merges newest first, breaking ties by id without mutating inputs', () => {
    const base = { player_id: 'p1', player_name: 'أحمد', created_at: now.toISOString(), reviewed_at: null, reply: null };
    const forms: Extract<InboxItem, { kind: 'form' }>[] = [
      { ...base, id: 'b', kind: 'form', exercise_name: 'سكوات', note: null },
    ];
    const checks: Extract<InboxItem, { kind: 'checkin' }>[] = [
      { ...base, id: 'a', kind: 'checkin', week_start: '2026-11-01', body_weight_kg: 80, waist_cm: null, notes: null },
      { ...base, id: 'c', kind: 'checkin', created_at: '2026-11-02T12:00:00Z', week_start: '2026-11-01', body_weight_kg: null, waist_cm: null, notes: null },
    ];
    expect(mergeInbox(forms, checks).map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(forms).toHaveLength(1);
  });
  it.each([[0, 'دلوقتي'], [3, 'من 3 ساعات'], [24, 'إمبارح'], [96, 'من 4 أيام'], [240, 'من 10 أيام'], [264, 'من 11 يوم']])('labels %s hours', (hours, expected) => {
    expect(ageLabel(new Date(now.getTime() - hours * 3600000).toISOString(), now)).toBe(expected);
  });
  it('provides the exact quick replies', () => {
    expect(quickReplies('form')).toEqual(['الفورم ممتاز', 'ضهرك مفرود أكتر', 'نزّل الوزن شوية']);
    expect(quickReplies('checkin')).toEqual(['تقدم ممتاز كمّل', 'ركّز على الأكل الأسبوع ده', 'كلمني نظبط البرنامج']);
  });
});
describe('reviewItem', () => {
  it('sends only review fields and trims reply', async () => {
    expect(await reviewItem({ kind: 'form', id, reply: '  ممتاز  ' })).toEqual({ data: true });
    expect(mocks.client.from).toHaveBeenCalledWith('form_checks');
    expect(mocks.query.update).toHaveBeenCalledWith({ reviewed_at: now.toISOString(), captain_reply: 'ممتاز' });
    expect(mocks.query.eq).toHaveBeenCalledWith('captain_id', 'captain');
  });
  it('turns empty replies into null', async () => {
    await reviewItem({ kind: 'checkin', id, reply: '   ' });
    expect(mocks.query.update).toHaveBeenCalledWith({ reviewed_at: now.toISOString(), captain_reply: null });
  });
  it('rejects oversized replies before creating a client', async () => {
    expect(await reviewItem({ kind: 'form', id, reply: 'a'.repeat(1001) })).toHaveProperty('error');
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it('maps database failures to Arabic', async () => {
    mocks.query.select.mockResolvedValue({ data: null, error: { message: 'database failure' } });
    expect(await reviewItem({ kind: 'form', id, reply: '' })).toEqual({ error: 'الرد متبعتش. جرّب تاني' });
  });
  it('treats an invisible row as failure', async () => {
    mocks.query.select.mockResolvedValue({ data: [], error: null });
    expect(await reviewItem({ kind: 'form', id, reply: '' })).toHaveProperty('error');
  });
  it('rejects invalid identities before any network request', async () => {
    expect(await reviewItem({ kind: 'invalid', id, reply: '' })).toHaveProperty('error');
    expect(await reviewItem({ kind: 'form', id: 'bad', reply: '' })).toHaveProperty('error');
    expect(mocks.server).not.toHaveBeenCalled();
  });
});
describe('mediaUrls', () => {
  beforeEach(() => {
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.signing.createSignedUrls.mockResolvedValue({ data: [{ signedUrl: 'https://example.test/signed' }], error: null });
  });
  it('signs only the stored video path for ten minutes', async () => {
    mocks.query.single.mockResolvedValue({ data: { video_path: 'player/video.mp4' }, error: null });
    expect(await mediaUrls({ kind: 'form', id, paths: ['attacker/path'] })).toEqual({ data: ['https://example.test/signed'] });
    expect(mocks.client.storage.from).toHaveBeenCalledWith('form-videos');
    expect(mocks.signing.createSignedUrls).toHaveBeenCalledWith(['player/video.mp4'], 600);
  });
  it('limits check-in photos to three', async () => {
    mocks.query.single.mockResolvedValue({ data: { photo_paths: ['a', 'b', 'c', 'd'] }, error: null });
    await mediaUrls({ kind: 'checkin', id });
    expect(mocks.client.storage.from).toHaveBeenCalledWith('checkin-photos');
    expect(mocks.signing.createSignedUrls).toHaveBeenCalledWith(['a', 'b', 'c'], 600);
  });
  it('does not sign paths when RLS hides the row', async () => {
    mocks.query.single.mockResolvedValue({ data: null, error: { message: 'missing' } });
    expect(await mediaUrls({ kind: 'form', id })).toHaveProperty('error');
    expect(mocks.signing.createSignedUrls).not.toHaveBeenCalled();
  });
  it('maps individual signing errors to a retryable error', async () => {
    mocks.query.single.mockResolvedValue({ data: { video_path: 'player/video.mp4' }, error: null });
    mocks.signing.createSignedUrls.mockResolvedValue({ data: [{ signedUrl: null, error: 'denied' }], error: null });
    expect(await mediaUrls({ kind: 'form', id })).toHaveProperty('error');
  });
});
