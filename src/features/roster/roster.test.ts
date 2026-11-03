import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lastSeenLabel, playerStatus } from './status';
import { inviteDaysSchema, inviteMessage, inviteUrl, whatsappShareUrl } from './invite';
import { createInvite } from './data/create-invite';
import { archivePlayer } from './data/archive-player';
import { fetchRoster } from './data/roster';

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), insert: vi.fn(), update: vi.fn(), single };
  const client = { auth: { getUser: vi.fn() }, from: vi.fn(), rpc: vi.fn() };
  return { query, client, revalidate: vi.fn() };
});
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => mocks.client }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-31T23:30:00Z'));
  vi.resetAllMocks();
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: 'captain-id' } }, error: null });
  mocks.client.from.mockReturnValue(mocks.query);
  for (const method of ['select', 'eq', 'is', 'insert', 'update'] as const) mocks.query[method].mockReturnValue(mocks.query);
  mocks.query.single.mockResolvedValue({ data: { role: 'captain', suspended_at: null }, error: null });
});
afterEach(() => { vi.useRealTimers(); });

const today = '2026-11-03';
const base = { today, startedOn: '2026-10-01', lastTrainingDate: today, accessUntil: '2026-12-01' };

describe('playerStatus', () => {
  it.each([
    ['2026-10-30', 'expired'], ['2026-10-31', 'grace'], ['2026-11-02', 'grace'],
    ['2026-11-03', 'ending'], ['2026-11-10', 'ending'], ['2026-11-11', 'active'],
  ])('access ending %s has status %s before training status', (accessUntil, expected) => {
    expect(playerStatus({ ...base, accessUntil })).toBe(expected);
    expect(playerStatus({ ...base, accessUntil, lastTrainingDate: null })).toBe(expected === 'active' ? 'late' : expected);
  });
  it('marks four days without training late, but three days active', () => {
    expect(playerStatus({ ...base, lastTrainingDate: '2026-10-30' })).toBe('late');
    expect(playerStatus({ ...base, lastTrainingDate: '2026-10-31' })).toBe('active');
  });
  it('gives a new player four days to start, including across month boundaries', () => {
    expect(playerStatus({ ...base, startedOn: '2026-10-30', lastTrainingDate: null })).toBe('late');
    expect(playerStatus({ ...base, startedOn: '2026-10-31', lastTrainingDate: null })).toBe('active');
  });
});

describe('lastSeenLabel', () => {
  it.each([[null, 'لسه مبدأش'], [today, 'النهارده'], ['2026-11-02', 'امبارح'], ['2026-10-31', 'من 3 أيام']])('%s → %s', (date, label) => {
    expect(lastSeenLabel(date, today)).toBe(label);
  });
});

describe('invites', () => {
  it('builds the invite and exact captain message', () => {
    const url = inviteUrl('abc-DEF_123');
    expect(url).toBe('https://kochivo.site/i/abc-DEF_123');
    expect(inviteMessage('أحمد', url)).toBe(`كابتن أحمد بيدعوك تبدأ معاه على كوتشيفو. افتح اللينك: ${url}`);
  });
  it('encodes Arabic, spaces, ampersands and link parameters for WhatsApp', () => {
    const message = 'أحمد & محمد https://kochivo.site/i/a?x=1&y=2';
    const url = whatsappShareUrl(message);
    expect(url).toBe(`https://wa.me/?text=${encodeURIComponent(message)}`);
    expect(new URL(url).searchParams.get('text')).toBe(message);
  });
  it.each([7, 30, 90])('accepts %s days', (days) => expect(inviteDaysSchema.safeParse(days).success).toBe(true));
  it.each([0, -7, 8, 29, 91, 7.5, '30', null, undefined])('rejects %s days', (days) => expect(inviteDaysSchema.safeParse(days).success).toBe(false));
});

describe('server actions and roster reads', () => {
  it.each([7, 30, 90])('creates a %s day invite using Cairo today and the verified session', async (days) => {
    mocks.query.single.mockResolvedValueOnce({ data: { role: 'captain' }, error: null })
      .mockResolvedValueOnce({ data: { code: 'invite-code' }, error: null });
    expect(await createInvite(days)).toEqual({ code: 'invite-code' });
    const expected = new Date('2026-11-01T00:00:00Z');
    expected.setUTCDate(expected.getUTCDate() + days);
    expect(mocks.query.insert).toHaveBeenCalledWith({ id: expect.stringMatching(/^[a-f0-9-]{14}7/), captain_id: 'captain-id', access_until: expected.toISOString().substring(0, 10) });
  });
  it('rejects invalid duration before accessing the database', async () => {
    expect(await createInvite(14)).toEqual({ error: 'اختار 7 أو 30 أو 90 يوم' });
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it('requires a signed-in captain', async () => {
    mocks.client.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await createInvite(7)).toEqual({ error: 'سجّل دخولك الأول' });
    mocks.query.single.mockResolvedValueOnce({ data: { role: 'player' }, error: null });
    expect(await createInvite(7)).toEqual({ error: 'الدعوات للكباتن بس' });
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });
  it('maps a suspended captain RLS rejection', async () => {
    mocks.query.single.mockResolvedValueOnce({ data: { role: 'captain' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '42501' } })
      .mockResolvedValueOnce({ data: { suspended_at: '2026-11-01' }, error: null });
    expect(await createInvite(30)).toEqual({ error: 'حسابك موقوف. كلّم الدعم' });
  });
  it('reports insert and network errors', async () => {
    mocks.query.single.mockResolvedValueOnce({ data: { role: 'captain' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '500' } });
    expect(await createInvite(30)).toEqual({ error: 'الدعوة متعملتش. جرّب تاني' });
    mocks.client.auth.getUser.mockRejectedValueOnce(new Error('offline'));
    expect(await createInvite(30)).toEqual({ error: 'الدعوة متعملتش. جرّب تاني' });
  });
  it('maps roster RPC rows without accepting a player id', async () => {
    mocks.client.rpc.mockResolvedValueOnce({ data: [{ player_id: 'p', full_name: 'علي', access_until: '2026-12-01', started_on: '2026-10-01', last_training_date: null, program_title: null, open_tasks: 2 }], error: null });
    expect(await fetchRoster()).toEqual({ players: [{ playerId: 'p', fullName: 'علي', accessUntil: '2026-12-01', startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 2 }] });
    expect(mocks.client.rpc).toHaveBeenCalledWith('captain_roster', {});
    mocks.client.rpc.mockResolvedValueOnce({ data: null, error: { code: '500' } });
    expect(await fetchRoster()).toHaveProperty('error');
    mocks.client.rpc.mockRejectedValueOnce(new Error('offline'));
    expect(await fetchRoster()).toHaveProperty('error');
  });
  it('archives only the session captain active relationship and revalidates', async () => {
    const playerId = '018bfc00-0000-7000-8000-000000000001';
    mocks.query.select.mockResolvedValueOnce({ data: [{ player_id: playerId }], error: null });
    expect(await archivePlayer(playerId)).toEqual({ success: true });
    expect(mocks.query.update).toHaveBeenCalledWith({ archived_at: '2026-10-31T23:30:00.000Z' });
    expect(mocks.query.eq).toHaveBeenCalledWith('captain_id', 'captain-id');
    expect(mocks.query.eq).toHaveBeenCalledWith('player_id', playerId);
    expect(mocks.query.is).toHaveBeenCalledWith('archived_at', null);
    expect(mocks.revalidate).toHaveBeenCalledWith('/captain');
  });
  it('rejects invalid ids and reports unmatched or RLS-denied archives', async () => {
    expect(await archivePlayer('bad')).toHaveProperty('error');
    expect(mocks.query.update).not.toHaveBeenCalled();
    mocks.query.select.mockResolvedValueOnce({ data: [], error: null });
    expect(await archivePlayer('018bfc00-0000-7000-8000-000000000001')).toHaveProperty('error');
    mocks.query.select.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    expect(await archivePlayer('018bfc00-0000-7000-8000-000000000001')).toHaveProperty('error');
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
