import { beforeEach, expect, it, vi } from 'vitest';
import { joinWaitlist } from './data/waitlist';
import { waitlistMember } from './data/waitlist-member';
const mock = vi.hoisted(() => ({ user: null as null | { id: string }, linked: false, error: null as null | { code: string }, insert: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: mock.user }, error: null }) },
  rpc: async (name: string) => ({ data: name === 'coach_public_profile' ? [{ id: 'coach' }] : [{ accepting: false }], error: null }),
  from: (table: string) => table === 'coach_waitlist' ? { insert: mock.insert } : {
    select() { return this; }, eq() { return this; }, is() { return this; },
    maybeSingle: async () => ({ data: mock.linked ? { captain_id: 'coach' } : null, error: null }),
  },
}) }));
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); mock.user = null; mock.linked = false; mock.error = null;
  mock.insert.mockReset().mockImplementation(async () => ({ error: mock.error })); });
it('sends signed-out visitors to signup with a return URL without inserting', async () => {
  const result = await joinWaitlist('ali');
  expect(result).toEqual({ redirect: '/login?tab=signup&next=%2Fc%2Fali' });
  expect(mock.insert).not.toHaveBeenCalled();
});
it('inserts only the authenticated player and treats duplicate taps as success', async () => {
  mock.user = { id: 'player' };
  expect(await joinWaitlist('ali')).toEqual({ status: 'waitlisted' });
  expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ captain_id: 'coach', player_id: 'player' }));
  mock.error = { code: '23505' };
  expect(await joinWaitlist('ali')).toEqual({ status: 'waitlisted' });
  mock.error = { code: '42501' };
  expect(await joinWaitlist('ali')).toEqual({ status: 'failure' });
});
it('preserves the member state and rejects flag-off or invalid requests', async () => {
  mock.user = { id: 'player' }; mock.linked = true;
  expect(await joinWaitlist('ali')).toEqual({ status: 'member' });
  expect(mock.insert).not.toHaveBeenCalled();
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(await joinWaitlist('ali')).toEqual({ status: 'failure' });
});
it('detects membership before rendering full captain actions without inserting', async () => {
  expect(await waitlistMember('coach')).toBe(false);
  mock.user = { id: 'player' };
  expect(await waitlistMember('coach')).toBe(false);
  mock.linked = true;
  expect(await waitlistMember('coach')).toBe(true);
  expect(mock.insert).not.toHaveBeenCalled();
});
