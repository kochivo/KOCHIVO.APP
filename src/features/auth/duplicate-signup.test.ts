import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { signUpCaptain } from './data/sign-up-captain';
import { signUpPlayer } from './data/sign-up-player';

const state = vi.hoisted(() => ({ signup: vi.fn(), cookie: { set: vi.fn() }, complete: vi.fn(), locale: 'en' as 'en' | 'ar' }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => state.cookie }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, state.locale) }));
vi.mock('./data/coach-request', () => ({ completeCoachRequest: state.complete }));
vi.mock('./data/auth-client', () => ({
  authClient: async () => ({ auth: { signUp: state.signup,
    getUser: async () => ({ data: { user: null }, error: null }) },
    rpc: async () => ({ data: [{ id: 'coach' }], error: null }) }),
  siteOrigin: async () => 'http://localhost:3000',
  runAction: async (work: () => Promise<unknown>) => work(),
}));
const input = { email: 'coach@example.com', password: 'password123', full_name: 'Coach' };
beforeEach(() => {
  vi.clearAllMocks();
  state.locale = 'en';
  state.signup.mockResolvedValue({ data: { session: null, user: { identities: [{ provider: 'email' }] } }, error: null });
});

it.each(['captain', 'player'] as const)('does not claim a code was sent for an obfuscated duplicate %s signup', async role => {
  state.signup.mockResolvedValue({ data: { session: null, user: { identities: [] } }, error: null });
  const result = await (role === 'captain' ? signUpCaptain(input) : signUpPlayer(input, 'ahmed'));
  expect(result).toEqual({ error: 'Try signing in or resetting your password' });
  expect(state.cookie.set).not.toHaveBeenCalled();
  expect(state.complete).not.toHaveBeenCalled();
});

it.each(['captain', 'player'] as const)('keeps verification available for a new or unverified %s with an identity', async role => {
  const result = await (role === 'captain' ? signUpCaptain(input) : signUpPlayer(input, 'ahmed'));
  expect(result).toHaveProperty('codeEmail', input.email);
  expect(result).not.toHaveProperty('error');
});

it('uses Egyptian Arabic guidance for a duplicate email', async () => {
  state.locale = 'ar';
  state.signup.mockResolvedValue({ data: { session: null, user: { identities: [] } }, error: null });
  expect(await signUpCaptain(input)).toEqual({ error: createT(messages, 'ar')('trySigningInOrResettingYour') });
});
