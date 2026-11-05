import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { signUpPlayer, verifyPlayerCode } from './data/sign-up-player';
import { signInGoogle } from './data/sign-in-google';
import { handleAuthCallback } from './data/callback';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

const mock = vi.hoisted(() => ({ getUser: vi.fn(), getClaims: vi.fn(), signup: vi.fn(), verifyOtp: vi.fn(), oauth: vi.fn(), exchange: vi.fn(),
  insert: vi.fn(), single: vi.fn(), rpc: vi.fn(), cookie: { get: vi.fn(), set: vi.fn(), delete: vi.fn() } }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '01900000-0000-7000-8000-000000000001' }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en'), getLocale: async () => 'en' }));
vi.mock('next/headers', () => ({ cookies: async () => mock.cookie, headers: async () => new Headers({ host: 'localhost:3000' }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: mock.getUser, getClaims: mock.getClaims, signUp: mock.signup,
    verifyOtp: mock.verifyOtp, signInWithOAuth: mock.oauth, exchangeCodeForSession: mock.exchange },
  rpc: mock.rpc, from: () => ({ insert: mock.insert, select: () => ({ eq: () => ({ single: mock.single }) }) }),
}) }));
const input = { full_name: 'Ali', email: 'ali@example.com', password: 'password123' };
beforeEach(() => {
  vi.clearAllMocks();
  mock.cookie.get.mockReturnValue(undefined);
  mock.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mock.getClaims.mockResolvedValue({ data: { claims: { sub: 'player' } }, error: null });
  mock.single.mockResolvedValue({ data: { role: 'player', role_confirmed: true }, error: null });
  mock.rpc.mockResolvedValue({ data: [{ id: 'captain' }], error: null });
  mock.signup.mockResolvedValue({ data: { session: null }, error: null });
  mock.oauth.mockResolvedValue({ data: { url: 'https://accounts.google.com/' }, error: null });
  mock.exchange.mockResolvedValue({ error: null });
  mock.verifyOtp.mockResolvedValue({ error: null });
  mock.insert.mockResolvedValue({ error: null });
});
it('keeps the slug in email confirmation and never inserts an unauthenticated request', async () => {
  expect(await signUpPlayer(input, 'ahmed')).toEqual({ codeEmail: input.email,
    message: 'Open the confirmation email so we can send your request to the coach' });
  expect(mock.signup).toHaveBeenCalledWith({ email: input.email, password: input.password,
    options: { data: { role: 'player', full_name: 'Ali' }, emailRedirectTo: 'http://localhost:3000/auth/callback?coach=ahmed' } });
  expect(mock.insert).not.toHaveBeenCalled();
});
it('verifies the player code and confirms the role before creating the coach request', async () => {
  mock.single.mockResolvedValueOnce({ data: { role: 'player', role_confirmed: false }, error: null });
  mock.getUser.mockResolvedValue({ data: { user: { id: 'player' } }, error: null });
  expect(await verifyPlayerCode({ email: input.email, token: '123456' }, 'ahmed')).toEqual({ redirect: '/c/ahmed?requested=1' });
  expect(mock.verifyOtp).toHaveBeenCalledWith({ email: input.email, token: '123456', type: 'signup' });
  expect(mock.rpc).toHaveBeenCalledWith('confirm_role', { p_role: 'player' });
  expect(mock.verifyOtp.mock.invocationCallOrder[0]).toBeLessThan(mock.rpc.mock.invocationCallOrder[0] ?? 0);
  expect(mock.rpc.mock.invocationCallOrder[0]).toBeLessThan(mock.insert.mock.invocationCallOrder[0] ?? 0);
  expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ captain_id: 'captain', player_id: 'player' }));
});
it('does not reconfirm an already confirmed player', async () => {
  mock.getUser.mockResolvedValue({ data: { user: { id: 'player' } }, error: null });
  expect(await verifyPlayerCode({ email: input.email, token: '123456' }, 'ahmed')).toHaveProperty('redirect');
  expect(mock.rpc.mock.calls.some(call => call[0] === 'confirm_role')).toBe(false);
});
it.each([['validation_failed', 'Wrong code'], ['otp_expired', 'Code expired. Request a new code']])('rejects player code error %s before requesting', async (code, error) => {
  mock.verifyOtp.mockResolvedValueOnce({ error: { code } });
  expect(await verifyPlayerCode({ email: input.email, token: '123456' }, 'ahmed')).toEqual({ error });
  expect(mock.rpc).not.toHaveBeenCalled();
  expect(mock.insert).not.toHaveBeenCalled();
});
it('validates the player code and coach before verification', async () => {
  expect(await verifyPlayerCode({ email: input.email, token: '123' }, 'ahmed')).toHaveProperty('error');
  expect(await verifyPlayerCode({ email: input.email, token: '123456' }, '../bad')).toHaveProperty('error');
  expect(mock.verifyOtp).not.toHaveBeenCalled();
});
it('creates a request when signup immediately returns an authenticated session', async () => {
  mock.signup.mockResolvedValue({ data: { session: {} }, error: null });
  mock.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    .mockResolvedValue({ data: { user: { id: 'player' } }, error: null });
  expect(await signUpPlayer(input, 'ahmed')).toEqual({ redirect: '/c/ahmed?requested=1' });
  expect(mock.insert).toHaveBeenCalledWith({ id: '01900000-0000-7000-8000-000000000001', captain_id: 'captain', player_id: 'player' });
  expect(mock.rpc.mock.calls.every(call => call[0] !== 'redeem_invite')).toBe(true);
});
it('persists coach intent through Google and requests only after the callback exchange', async () => {
  await signInGoogle('player', undefined, 'ahmed');
  expect(mock.cookie.set).toHaveBeenCalledWith('auth-intent', JSON.stringify({ intent: 'player', code: null, coach: 'ahmed' }),
    expect.objectContaining({ httpOnly: true, sameSite: 'lax' }));
  mock.cookie.get.mockReturnValue({ value: JSON.stringify({ intent: 'player', coach: 'ahmed' }) });
  mock.getUser.mockResolvedValue({ data: { user: { id: 'player' } }, error: null });
  const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?code=oauth-code'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/c/ahmed?requested=1');
  expect(mock.exchange.mock.invocationCallOrder[0]).toBeLessThan(mock.insert.mock.invocationCallOrder[0] ?? 0);
});
it('preserves email coach intent and exposes failures without auto-linking', async () => {
  mock.getUser.mockResolvedValue({ data: { user: { id: 'player' } }, error: null });
  mock.insert.mockResolvedValue({ error: { code: '42501' } });
  const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?code=email-code&coach=ahmed'));
  const target = new URL(response.headers.get('location') ?? 'http://localhost');
  expect(target.pathname).toBe('/login'); expect(target.searchParams.get('coach')).toBe('ahmed');
  expect(target.searchParams.has('error')).toBe(true);
  expect(mock.rpc.mock.calls.every(call => call[0] !== 'redeem_invite')).toBe(true);
});
it('ignores a stale invite cookie when confirming a public-coach signup email', async () => {
  mock.cookie.get.mockReturnValue({ value: JSON.stringify({ intent: 'player', code: 'old-invite' }) });
  mock.getUser.mockResolvedValue({ data: { user: { id: 'player' } }, error: null });
  const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?code=email-code&coach=ahmed'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/c/ahmed?requested=1');
  expect(mock.rpc.mock.calls.every(call => call[0] !== 'redeem_invite')).toBe(true);
  expect(mock.insert).toHaveBeenCalledOnce();
});
it('gives the coach in an email confirmation precedence over a stale Google coach cookie', async () => {
  mock.cookie.get.mockReturnValue({ value: JSON.stringify({ intent: 'player', coach: 'other-coach' }) });
  mock.getUser.mockResolvedValue({ data: { user: { id: 'player' } }, error: null });
  const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?code=email-code&coach=ahmed'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/c/ahmed?requested=1');
  expect(mock.rpc).toHaveBeenCalledWith('coach_public_profile', { slug: 'ahmed' });
});
