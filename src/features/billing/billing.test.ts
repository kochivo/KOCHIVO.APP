import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reminderText, renewalPreview, waLink } from './renew';
import { renewPlayer } from './data/billing';
import { fetchBillingAt } from './data/billing-internal';

const fetchBilling = () => fetchBillingAt(new Date('2026-11-02T23:30:00Z'));

const mocks = vi.hoisted(() => ({ server: vi.fn(), rpc: vi.fn(), user: vi.fn(), profile: vi.fn(), from: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: mocks.server }));

describe('renewal dates and reminders', () => {
  it.each([
    ['2026-11-10', '2026-11-03', 30, '2026-11-11', '2026-12-10'],
    ['2026-10-01', '2026-11-03', 30, '2026-11-03', '2026-12-02'],
    ['2026-11-03', '2026-11-03', 1, '2026-11-04', '2026-11-04'],
    ['2026-01-30', '2026-01-20', 2, '2026-01-31', '2026-02-01'],
  ])('previews %s on %s for %s days', (access, today, days, start, end) => {
    expect(renewalPreview(access, today, days)).toEqual({ start, end });
  });
  it('prepares a short Arabic reminder', () => {
    expect(reminderText('علي', '2026-11-03')).toBe('يا علي، اشتراكك مع الكابتن بيخلص 3 نوفمبر. تحب نجدد؟');
  });
  it('requires digits and encodes the message', () => {
    expect(waLink(null, 'رسالة')).toBeNull();
    expect(waLink('', 'رسالة')).toBeNull();
    expect(waLink('  +  ', 'رسالة')).toBeNull();
    expect(waLink('+20 (100) 123-4567', 'يا علي؟ &')).toBe(`https://wa.me/201001234567?text=${encodeURIComponent('يا علي؟ &')}`);
  });
});

describe('renewPlayer', () => {
  const input = { playerId: '11111111-1111-4111-8111-111111111111', days: 30, amount: null };
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ data: { user: { id: 'captain-session' } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: 'captain' }, error: null });
    const query = { select: () => query, eq: () => query, single: mocks.profile };
    mocks.from.mockReturnValue(query);
    mocks.server.mockResolvedValue({ auth: { getUser: mocks.user }, from: mocks.from, rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: '2026-12-10', error: null });
  });
  it.each([0, 366, 1.5, NaN])('rejects invalid days %s before network access', async (days) => {
    expect(await renewPlayer({ ...input, days })).toEqual({ error: 'راجع المدة والمبلغ وجرّب تاني' });
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it.each([-1, 100001, 1.5])('rejects invalid amounts %s before network access', async (amount) => {
    expect(await renewPlayer({ ...input, amount })).toHaveProperty('error');
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it('rejects an invalid player id before network access', async () => {
    expect(await renewPlayer({ ...input, playerId: 'bad' })).toHaveProperty('error');
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it('omits a null amount so the SQL default applies', async () => {
    expect(await renewPlayer(input)).toEqual({ data: '2026-12-10' });
    expect(mocks.rpc).toHaveBeenCalledWith('renew_player', { p_player: input.playerId, p_days: 30 });
  });
  it.each([0, 800])('preserves a supplied amount of %s', async amount => {
    expect(await renewPlayer({ ...input, amount })).toEqual({ data: '2026-12-10' });
    expect(mocks.rpc).toHaveBeenCalledWith('renew_player', { p_player: input.playerId, p_days: 30, p_amount: amount });
  });
  it.each([
    ['42501', 'مش مسموح تجدّد للاعب ده. راجع حسابك'],
    ['22023', 'راجع المدة والمبلغ وجرّب تاني'],
    ['XX000', 'التجديد متسجلش. جرّب تاني'],
  ])('maps SQL error %s', async (code, error) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await renewPlayer(input)).toEqual({ error });
  });
  it('handles network failure', async () => {
    mocks.rpc.mockRejectedValue(new Error('offline'));
    expect(await renewPlayer(input)).toEqual({ error: 'التجديد متسجلش. جرّب تاني' });
  });
  it('requires a captain session', async () => {
    mocks.profile.mockResolvedValue({ data: { role: 'player' }, error: null });
    expect(await renewPlayer(input)).toHaveProperty('error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe('fetchBilling', () => {
  const player = { player_id: 'player-1', full_name: 'علي', access_until: '2026-12-01', started_on: '2026-10-01',
    last_training_date: '2026-11-03', program_title: null, open_tasks: 0 };
  const payment = { id: 'payment-1', captain_id: 'session-captain', player_id: 'player-1', amount_egp: 800,
    days: 30, period_start: '2026-11-02', period_end: '2026-12-01', created_at: '2026-11-02T12:00:00Z' };
  const filters = vi.fn();
  let phoneError = false;
  let paymentError = false;
  beforeEach(() => {
    vi.resetAllMocks();
    phoneError = false;
    paymentError = false;
    mocks.user.mockResolvedValue({ data: { user: { id: 'session-captain' } }, error: null });
    mocks.rpc.mockImplementation(async (name: string) => ({
      error: name === 'captain_last_payments' && paymentError ? { code: '500' } : null,
      data: name === 'current_tier' ? 'champion' : name === 'captain_last_payments' ? [payment] : [player],
    }));
    mocks.from.mockImplementation((table: string) => {
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => { filters(table, 'eq', ...args); return query; },
        lte: (...args: unknown[]) => { filters(table, 'lte', ...args); return query; },
        gt: (...args: unknown[]) => { filters(table, 'gt', ...args); return query; },
        order: () => query, limit: () => query,
        in: async () => ({ data: [{ id: 'player-1', phone: '+201001234567' }], error: phoneError ? { code: '500' } : null }),
        single: async () => ({ data: table === 'profiles' ? { role: 'captain' } : { tier: 'champion', player_limit: 20, price_egp: 399 }, error: null }),
        maybeSingle: async () => ({ data: { ends_at: '2026-12-01T00:00:00Z' }, error: null }),
      };
      return query;
    });
    mocks.server.mockResolvedValue({ auth: { getUser: mocks.user }, from: mocks.from, rpc: mocks.rpc });
  });
  it('combines the roster, phones, last payments and the session captain plan', async () => {
    expect(await fetchBilling()).toEqual({ data: {
      players: [{ playerId: 'player-1', fullName: 'علي', accessUntil: '2026-12-01', startedOn: '2026-10-01',
        lastTrainingDate: '2026-11-03', programTitle: null, openTasks: 0, status: 'active', phone: '+201001234567', lastPayment: payment }],
      plan: { tier: 'champion', player_limit: 20, price_egp: 399 }, used: 1, subscriptionEnd: '2026-12-01T00:00:00Z',
    } });
    expect(mocks.rpc).toHaveBeenCalledWith('current_tier', { p_captain: 'session-captain' });
    expect(mocks.rpc).toHaveBeenCalledWith('captain_last_payments');
    expect(mocks.from).not.toHaveBeenCalledWith('player_payments');
    expect(filters).toHaveBeenCalledWith('captain_subscriptions', 'lte', 'starts_at', '2026-11-02T23:30:00.000Z');
    expect(filters).toHaveBeenCalledWith('captain_subscriptions', 'gt', 'ends_at', '2026-11-02T23:30:00.000Z');
  });
  it('returns an empty roster with the plan', async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ error: null, data: name === 'current_tier' ? 'entry' : [] }));
    const result = await fetchBilling();
    expect(result.data?.players).toEqual([]);
    expect(result.data?.used).toBe(0);
    expect(mocks.from).not.toHaveBeenCalledWith('player_payments');
  });
  it.each([1, 40])('uses one payment RPC for %s players and maps missing payments to null', async (count) => {
    mocks.rpc.mockImplementation(async (name: string) => ({ error: null,
      data: name === 'current_tier' ? 'legend' : name === 'captain_last_payments' ? [payment]
        : Array.from({ length: count }, (_, index) => ({ ...player, player_id: `player-${count - index}` })),
    }));
    const result = await fetchBilling();
    expect(result.data?.players).toHaveLength(count);
    expect(result.data?.players.find((row) => row.playerId === 'player-1')?.lastPayment).toEqual(payment);
    expect(result.data?.players.filter((row) => row.playerId !== 'player-1').every((row) => row.lastPayment === null)).toBe(true);
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'captain_last_payments')).toEqual([['captain_last_payments']]);
    expect(mocks.from).not.toHaveBeenCalledWith('player_payments');
  });
  it.each(['phone', 'payment', 'roster'])('reports a %s read failure', async (failure) => {
    phoneError = failure === 'phone';
    paymentError = failure === 'payment';
    if (failure === 'roster') mocks.rpc.mockResolvedValue({ data: null, error: { code: '500' } });
    expect(await fetchBilling()).toEqual({ error: 'مش قادرين نحمّل الاشتراكات. جرّب تاني' });
  });
  it('denies an anonymous session before loading billing', async () => {
    mocks.user.mockResolvedValue({ data: { user: null }, error: null });
    expect(await fetchBilling()).toHaveProperty('error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
