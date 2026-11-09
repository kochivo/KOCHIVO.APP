import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './signup/messages';
import type { Messages } from '@/core/i18n/messages';
import { signUpCaptain, verifyCaptainCode } from './data/sign-up-captain';
import type { AuthUser } from './routing';

const state = vi.hoisted(() => ({ profile: vi.fn(), signOut: vi.fn(), rpc: vi.fn(),
  cookie: { set: vi.fn(), delete: vi.fn() } }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => state.cookie }));
vi.mock('@/core/i18n/server', () => ({ getT: async (dictionary: Messages) => createT(dictionary, 'en') }));
vi.mock('./data/auth-client', () => ({
  authClient: async () => ({ rpc: state.rpc, auth: {
    signUp: async () => ({ data: { session: {} }, error: null }),
    verifyOtp: async () => ({ error: null }), signOut: state.signOut,
  } }),
  profile: state.profile,
  runAction: async (work: () => Promise<unknown>) => work(),
}));
const input = { email: 'player@example.com', password: 'password123', full_name: 'Coach' };
const code = { email: input.email, token: '123456' };
beforeEach(() => {
  vi.resetAllMocks();
  state.profile.mockResolvedValue({ role: 'player', roleConfirmed: true, admin: false } satisfies AuthUser);
  state.signOut.mockResolvedValue({ error: null });
  state.rpc.mockResolvedValue({ error: null });
});

it.each(['session', 'code'])('does not complete captain signup as an existing player through %s', async flow => {
  const result = await (flow === 'session' ? signUpCaptain(input) : verifyCaptainCode(code));
  expect(result).toEqual({ error: createT(messages, 'en')('playerAccount') });
  expect(result).not.toHaveProperty('redirect');
  expect(state.signOut).toHaveBeenCalledOnce();
  expect(state.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(state.cookie.delete).toHaveBeenCalledWith('auth-intent');
  expect(state.rpc).not.toHaveBeenCalled();
});

it('still confirms a new, unconfirmed profile as a pending captain', async () => {
  state.profile.mockResolvedValue({ role: 'player', roleConfirmed: false, admin: false } satisfies AuthUser);
  expect(await verifyCaptainCode(code)).toEqual({ redirect: '/captain/pending' });
  expect(state.rpc).toHaveBeenCalledWith('confirm_role', { p_role: 'captain' });
  expect(state.signOut).not.toHaveBeenCalled();
});

it('preserves admin routing even when the admin profile has a player role', async () => {
  state.profile.mockResolvedValue({ role: 'player', roleConfirmed: true, admin: true } satisfies AuthUser);
  expect(await verifyCaptainCode(code)).toEqual({ redirect: '/admin' });
  expect(state.signOut).not.toHaveBeenCalled();
});
