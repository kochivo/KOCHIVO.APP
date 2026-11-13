import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeCoachRequest } from './data/coach-request';
const mock = vi.hoisted(() => ({ profile: vi.fn(), rpc: vi.fn(), insert: vi.fn(), getUser: vi.fn(), link: vi.fn(), pending: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '01900000-0000-7000-8000-000000000001' }));
vi.mock('./data/auth-client', () => ({ profile: mock.profile }));
const calls: unknown[][] = [];
const client = { rpc: mock.rpc, auth: { getUser: mock.getUser }, from: (table: string) => {
  calls.push(['from', table]);
  const query = {
    select: (columns: string) => { calls.push(['select', columns]); return query; },
    eq: (column: string, value: string) => { calls.push(['eq', column, value]); return query; },
    is: (column: string, value: null) => { calls.push(['is', column, value]); return query; },
    maybeSingle: () => (table === 'coach_clients' ? mock.link() : mock.pending()),
    insert: mock.insert,
  };
  return query;
} };
const complete = () => completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'ahmed');
beforeEach(() => {
  vi.resetAllMocks();
  calls.length = 0;
  mock.profile.mockResolvedValue({ role: 'player', roleConfirmed: false });
  mock.rpc.mockResolvedValue({ data: [{ id: 'captain-id' }], error: null });
  mock.getUser.mockResolvedValue({ data: { user: { id: 'player-id' } }, error: null });
  mock.insert.mockResolvedValue({ error: null });
  mock.link.mockResolvedValue({ data: null, error: null });
  mock.pending.mockResolvedValue({ data: null, error: null });
});
it('confirms player intent and creates a pending request without redeeming an invite', async () => {
  mock.rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ data: [{ id: 'captain-id' }], error: null });
  const result = await completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'ahmed');
  expect(result).toBe('/c/ahmed?requested=1');
  expect(mock.rpc.mock.calls).toEqual([['confirm_role', { p_role: 'player' }], ['coach_public_profile', { slug: 'ahmed' }]]);
  expect(mock.insert).toHaveBeenCalledWith({ id: '01900000-0000-7000-8000-000000000001', captain_id: 'captain-id', player_id: 'player-id' });
  expect(calls).toEqual([
    ['from', 'coach_clients'], ['select', 'captain_id'], ['eq', 'player_id', 'player-id'], ['is', 'archived_at', null],
    ['from', 'coach_join_requests'],
  ]);
});
it.each([['captain-id', 'member'], ['other-captain', 'linked']])('returns %s link status without inserting', async (captain_id, status) => {
  mock.link.mockResolvedValue({ data: { captain_id }, error: null });
  expect(await complete()).toBe(`/c/ahmed?requested=${status}`);
  expect(mock.insert).not.toHaveBeenCalled();
});
it('reports sent after 23505 only for this player’s pending request to this captain', async () => {
  mock.insert.mockResolvedValue({ error: { code: '23505' } });
  mock.pending.mockResolvedValue({ data: { id: 'existing-request' }, error: null });
  expect(await complete()).toBe('/c/ahmed?requested=1');
  expect(calls.slice(-5)).toEqual([
    ['from', 'coach_join_requests'], ['select', 'id'], ['eq', 'player_id', 'player-id'],
    ['eq', 'captain_id', 'captain-id'], ['eq', 'status', 'pending'],
  ]);
  expect(mock.link).toHaveBeenCalledTimes(1);
});
it.each([['other-captain', 'linked'], ['captain-id', 'member']])('rechecks a racing %s link after 23505 without a pending request', async (captain_id, status) => {
  mock.insert.mockResolvedValue({ error: { code: '23505' } });
  mock.link.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { captain_id }, error: null });
  expect(await complete()).toBe(`/c/ahmed?requested=${status}`);
  expect(mock.link).toHaveBeenCalledTimes(2);
  expect(calls.slice(-4)).toEqual([
    ['from', 'coach_clients'], ['select', 'captain_id'], ['eq', 'player_id', 'player-id'], ['is', 'archived_at', null],
  ]);
});
it.each(['23505', '42501'])('throws an unexplained insert error %s', async code => {
  const error = { code, message: 'insert failed' };
  mock.insert.mockResolvedValue({ error });
  await expect(complete()).rejects.toBe(error);
  expect(mock.pending).toHaveBeenCalledTimes(code === '23505' ? 1 : 0);
});
it.each(['link', 'pending', 'fresh link'])('propagates a failed %s read', async read => {
  const error = { code: '42501', message: 'read failed' };
  if (read === 'link') mock.link.mockResolvedValue({ data: null, error });
  else {
    mock.insert.mockResolvedValue({ error: { code: '23505' } });
    if (read === 'pending') mock.pending.mockResolvedValue({ data: null, error });
    else mock.link.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: null, error });
  }
  await expect(complete()).rejects.toBe(error);
  if (read === 'link') expect(mock.insert).not.toHaveBeenCalled();
});
it('never changes a captain account or writes a request for it', async () => {
  mock.profile.mockResolvedValue({ role: 'captain', roleConfirmed: true });
  await expect(completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'ahmed')).rejects.toThrow();
  expect(mock.insert).not.toHaveBeenCalled();
});
it.each(['captain', 'player'])('routes an admin %s home before creating a coach request', async role => {
  mock.profile.mockResolvedValue({ role, roleConfirmed: false, admin: true });
  expect(await completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'ahmed')).toBe('/admin');
  expect(mock.rpc).not.toHaveBeenCalled();
  expect(mock.insert).not.toHaveBeenCalled();
});
it('rejects invalid and missing coaches before creating a request', async () => {
  await expect(completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'admin')).rejects.toThrow();
  mock.rpc.mockResolvedValue({ data: [], error: null });
  await expect(completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'missing')).rejects.toThrow();
  expect(mock.insert).not.toHaveBeenCalled();
});

describe('when the captain is full', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
    mock.profile.mockResolvedValue({ role: 'player', roleConfirmed: true });
    mock.rpc.mockImplementation((name: string) => Promise.resolve(name === 'coach_public_page'
      ? { data: [{ accepting: false }], error: null } : { data: [{ id: 'captain-id' }], error: null }));
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('joins the waitlist instead of sending a join request', async () => {
    expect(await complete()).toBe('/c/ahmed?requested=waitlist');
    expect(mock.insert).toHaveBeenCalledWith({ id: '01900000-0000-7000-8000-000000000001', captain_id: 'captain-id', player_id: 'player-id' });
    expect(calls).toContainEqual(['from', 'coach_waitlist']);
    expect(calls).not.toContainEqual(['from', 'coach_join_requests']);
  });

  it('treats a repeat signup as already waitlisted', async () => {
    mock.insert.mockResolvedValue({ error: { code: '23505' } });
    expect(await complete()).toBe('/c/ahmed?requested=waitlist');
  });

  it('keeps the join request when the captain has room or the flag is off', async () => {
    mock.rpc.mockImplementation((name: string) => Promise.resolve(name === 'coach_public_page'
      ? { data: [{ accepting: true }], error: null } : { data: [{ id: 'captain-id' }], error: null }));
    expect(await complete()).toBe('/c/ahmed?requested=1');
    vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
    calls.length = 0;
    expect(await complete()).toBe('/c/ahmed?requested=1');
    expect(calls).not.toContainEqual(['from', 'coach_waitlist']);
  });
});
