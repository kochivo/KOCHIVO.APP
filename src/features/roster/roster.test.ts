vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lastSeenLabel, playerStatus } from './status';
import { inviteDaysSchema, inviteMessage, inviteUrl } from './invite';
import { whatsappUrl } from '@/lib/whatsapp';
import { createInviteAt } from './data/create-invite-internal';
import { archivePlayerAt } from './data/archive-player-internal';

const createInvite = (days: unknown) => createInviteAt(days, new Date('2026-10-31T23:30:00Z'));
const archivePlayer = (id: unknown) => archivePlayerAt(id, new Date('2026-10-31T23:30:00Z'));
import { fetchRoster } from './data/roster';
import { captainNav } from './nav';
import { radarMessage, radarReasonLabel, radarWhatsappUrl } from './radar';
import { fetchRadar } from './data/radar';

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), insert: vi.fn(), update: vi.fn(), single };
  const client = { auth: { getUser: vi.fn(), getClaims: vi.fn() }, from: vi.fn(), rpc: vi.fn() };
  return { query, client, revalidate: vi.fn() };
});
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => mocks.client }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'captain-id' } }, error: null });
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: 'captain-id' } }, error: null });
  mocks.client.from.mockReturnValue(mocks.query);
  for (const method of ['select', 'eq', 'is', 'insert', 'update'] as const) mocks.query[method].mockReturnValue(mocks.query);
  mocks.query.single.mockResolvedValue({ data: { role: 'captain', suspended_at: null }, error: null });
});

const today = '2026-11-03';
const base = { today, startedOn: '2026-10-01', lastTrainingDate: today, accessUntil: '2026-12-01' };

describe('dropout radar', () => {
  it('addresses the player phone and encodes the ready Arabic message', () => {
    const player = { full_name: 'علي & أحمد', phone: '+201001234567', reason: 'no_activity' } as const;
    const url = new URL(radarWhatsappUrl(player) ?? '');
    expect(url.origin + url.pathname).toBe('https://wa.me/201001234567');
    expect(url.searchParams.get('text')).toBe(radarMessage(player.full_name, player.reason));
    expect(radarWhatsappUrl({ ...player, phone: null })).toBeNull();
  });
  it.each([
    ['no_activity', 3, 'مسجّلش تمرين من 3 أيام'],
    ['no_activity', 10, 'مسجّلش تمرين من 10 أيام'],
    ['no_activity', 11, 'مسجّلش تمرين من 11 يوم'],
    ['never_started', 3, 'لسه مبدأش من 3 أيام'],
    ['never_started', 11, 'لسه مبدأش من 11 يوم'],
    ['no_program', 2, 'من غير برنامج'],
  ] as const)('labels %s after %s days', (reason, days, label) => {
    expect(radarReasonLabel(reason, days)).toBe(label);
  });
  it.each([
    ['no_activity', 'يا علي، وحشتنا في التمرين. نرجع النهارده؟'],
    ['never_started', 'يا علي، جاهز نبدأ أول تمرين؟ أنا معاك.'],
    ['no_program', 'يا علي، هجهزلك برنامجك ونبدأ مع بعض.'],
  ] as const)('prepares a personal %s nudge', (reason, message) => {
    expect(radarMessage('علي', reason)).toBe(message);
  });
  it.each(['2026-1-03', '2026-02-30', '2026-13-01', '', null, 123])('rejects invalid today %s', async (date) => {
    expect(await fetchRadar(date)).toEqual({ error: 'التاريخ مش صحيح' });
    expect(mocks.client.rpc).not.toHaveBeenCalled();
  });
  it('passes the supplied Cairo date and preserves SQL order and nullable phones', async () => {
    const data = [{ player_id: 'p', full_name: 'علي', phone: null, reason: 'never_started', days: 3 }];
    mocks.client.rpc.mockResolvedValueOnce({ data, error: null });
    expect(await fetchRadar(today)).toEqual({ data });
    expect(mocks.client.rpc).toHaveBeenCalledWith('captain_dropout_radar', { p_today: today });
    mocks.client.rpc.mockResolvedValueOnce({ data: [], error: null });
    expect(await fetchRadar('2028-02-29')).toEqual({ data: [] });
  });
  it('maps RPC, missing data and network failures to Arabic', async () => {
    mocks.client.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockRejectedValueOnce(new Error('offline'));
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(await fetchRadar(today)).toEqual({ error: 'الرادار مش متاح دلوقتي' });
    }
  });
});

describe('captainNav', () => {
  it.each([
    ['/captain', 'الرئيسية'],
    ['/captain/players', 'اللاعبين'],
    ['/captain/players/x/programs', 'اللاعبين'],
    ['/captain/programs/abc', 'اللاعبين'],
    ['/captain/nutrition/abc', 'اللاعبين'],
    ['/captain/inbox', 'المهام'],
    ['/captain/inbox/x', 'المهام'],
    ['/captain/templates', 'البرامج'],
    ['/captain/templates/x', 'البرامج'],
    ['/captain/billing', 'الدفعات'],
    ['/captain/settings/x', 'الإعدادات'],
    ['/unknown', undefined],
    ['/captain/unknown', undefined],
    ['/captain/inboxes', undefined],
    ['/captain/players-other/x', undefined],
  ])('%s activates only %s', (pathname, label) => {
    expect(captainNav(pathname).filter((item) => item.active).map((item) => item.label))
      .toEqual(label ? [label] : []);
    expect(captainNav(pathname).map((item) => item.href)).toEqual([
      '/captain', '/captain/players', '/captain/inbox', '/captain/templates', '/captain/billing', '/captain/settings',
    ]);
  });

  it('names billing the same everywhere', () => {
    expect(captainNav('/captain').find((item) => item.href === '/captain/billing')?.label).toBe('الدفعات');
  });
});

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
    const url = whatsappUrl({ text: message });
    expect(url).toBe(`https://wa.me/?text=${encodeURIComponent(message)}`);
    expect(new URL(url).searchParams.get('text')).toBe(message);
  });
  it.each([7, 30, 90])('accepts %s days', (days) => expect(inviteDaysSchema.safeParse(days).success).toBe(true));
  it.each([0, -7, 8, 29, 91, 7.5, '30', null, undefined])('rejects %s days', (days) => expect(inviteDaysSchema.safeParse(days).success).toBe(false));
});

describe('server actions and roster reads', () => {
  it('blocks a demo invite before inserting', async () => {
    mocks.query.single.mockResolvedValue({ data: { role: 'captain', demo_expires_at: '2026-11-04T12:00:00Z' }, error: null });
    expect(await createInvite(30)).toEqual({ error: 'الدعوات مقفولة في الديمو' });
    expect(mocks.query.insert).not.toHaveBeenCalled();
  });
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
    mocks.query.select.mockReturnValueOnce({ in: async () => ({ data: [{ id: 'p', avatar_path: null }], error: null }) });
    mocks.client.rpc.mockResolvedValueOnce({ data: [{ player_id: 'p', full_name: 'علي', access_until: '2026-12-01', started_on: '2026-10-01', last_training_date: null, program_title: null, open_tasks: 2 }], error: null });
    expect(await fetchRoster()).toEqual({ players: [{ playerId: 'p', fullName: 'علي', avatarUrl: null, accessUntil: '2026-12-01', startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 2 }] });
    expect(mocks.client.rpc).toHaveBeenCalledWith('captain_roster');
    mocks.client.rpc.mockResolvedValueOnce({ data: null, error: { code: '500' } });
    expect(await fetchRoster()).toHaveProperty('error');
    mocks.client.rpc.mockRejectedValueOnce(new Error('offline'));
    expect(await fetchRoster()).toHaveProperty('error');
  });
  it('resolves roster avatar paths through the public avatar bucket', async () => {
    mocks.client.rpc.mockResolvedValueOnce({ data: [{ player_id: 'p', full_name: 'Ali' }], error: null });
    const inIds = vi.fn().mockResolvedValue({ data: [{ id: 'p', avatar_path: 'p/photo.webp' }], error: null });
    mocks.query.select.mockReturnValueOnce({ in: inIds });
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/p/photo.webp' } });
    Object.assign(mocks.client, { storage: { from: () => ({ getPublicUrl }) } });
    const result = await fetchRoster();
    expect(result.players?.[0]?.avatarUrl).toBe('https://example.com/p/photo.webp');
    expect(inIds).toHaveBeenCalledWith('id', ['p']);
    expect(getPublicUrl).toHaveBeenCalledWith('p/photo.webp');
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
