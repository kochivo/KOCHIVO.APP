import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { decideRoute } from './routing';
import { parseInviteCode } from './invite-code';
import { authError } from './errors';
import { emailSchema, passwordSchema, signInSchema, signUpSchema, resetSchema, otpSchema } from './schemas';
import { signInPassword } from './data/sign-in-password';
import { signUpCaptain } from './data/sign-up-captain';
import { signInGoogle } from './data/sign-in-google';
import { sendEmailCode } from './data/send-email-code';
import { verifyEmailCode } from './data/verify-email-code';
import { redeemInvite } from './data/redeem-invite';
import { requestReset } from './data/request-reset';
import { updatePassword } from './data/update-password';
import { handleAuthCallback } from './data/callback';
import { refreshSession } from '@/core/supabase/session';
import { callAuthAction } from './data/client-action';

const mocks = vi.hoisted(() => {
  const auth = {
    getClaims: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn(),
    signInWithOtp: vi.fn(), verifyOtp: vi.fn(), resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(), signOut: vi.fn(), exchangeCodeForSession: vi.fn(),
  };
  const single = vi.fn();
  const rpc = vi.fn();
  const cookie = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ single }) }) }));
  return { auth, single, rpc, cookie, from, client: { auth, rpc, from } };
});
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => mocks.client }));
vi.mock('next/headers', () => ({ cookies: async () => mocks.cookie, headers: async () => new Headers({ host: 'localhost:3000' }) }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => mocks.client }));
vi.mock('@/core/config/env', () => ({ publicEnv: () => ({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.com', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key' }) }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }));
  mocks.auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-id' } }, error: null });
  mocks.single.mockResolvedValue({ data: { role: 'player', role_confirmed: true }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  for (const action of Object.values(mocks.auth)) {
    if (action !== mocks.auth.getClaims) action.mockResolvedValue({ data: {}, error: null });
  }
});

describe('route decisions', () => {
  it('routes anonymous users without a workspace to demo using verified claims', async () => {
    mocks.auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'demo', is_anonymous: true } }, error: null });
    mocks.single.mockResolvedValue({ data: { role: 'player', role_confirmed: false }, error: null });
    const response = await refreshSession(new NextRequest('http://localhost:3000/captain'), decideRoute);
    expect(response.headers.get('location')).toBe('http://localhost:3000/demo');
  });
  it('lets a confirmed demo captain use captain routes', () => {
    expect(decideRoute({ path: '/captain', user: { role: 'captain', roleConfirmed: true, anonymous: true } })).toEqual({});
  });
  const captain = { role: 'captain', roleConfirmed: true } as const;
  const player = { role: 'player', roleConfirmed: true } as const;
  it('blocks suspended users on all routes except suspension, sign-out and callback', () => {
    for (const user of [captain, player, { ...captain, roleConfirmed: false }]) {
      for (const path of ['/', '/captain', '/player', '/login', '/i/abc', '/reset-password', '/suspended-other', '/auth/callback-other']) {
        expect(decideRoute({ path, user: { ...user, suspended: true } })).toEqual({ redirect: '/suspended' });
      }
      for (const path of ['/suspended', '/sign-out', '/auth/sign-out', '/auth/callback']) {
        expect(decideRoute({ path, user: { ...user, suspended: true } })).toEqual({});
      }
    }
  });
  for (const path of ['/', '/i/abc', '/forgot-password', '/reset-password', '/auth/callback', '/dev/ui', '/offline']) {
    for (const user of [null, captain, player]) it(`${path} is public for ${user?.role}`, () => {
      expect(decideRoute({ path, user })).toEqual({});
    });
  }
  for (const suffix of ['', '/nested']) {
    it(`protects role areas ${suffix}`, () => {
      expect(decideRoute({ path: `/captain${suffix}`, user: null })).toEqual({ redirect: '/login' });
      expect(decideRoute({ path: `/player${suffix}`, user: null })).toEqual({ redirect: '/login' });
      expect(decideRoute({ path: `/captain${suffix}`, user: player })).toEqual({ redirect: '/player' });
      expect(decideRoute({ path: `/player${suffix}`, user: captain })).toEqual({ redirect: '/captain' });
      expect(decideRoute({ path: `/captain${suffix}`, user: captain })).toEqual({});
      expect(decideRoute({ path: `/player${suffix}`, user: player })).toEqual({});
      expect(decideRoute({ path: `/captain${suffix}`, user: { ...captain, roleConfirmed: false } })).toEqual({ redirect: '/login' });
    });
  }
  for (const path of ['/login']) it(`redirects sessions from ${path}`, () => {
    expect(decideRoute({ path, user: null })).toEqual({});
    expect(decideRoute({ path, user: captain })).toEqual({ redirect: '/captain' });
    expect(decideRoute({ path, user: player })).toEqual({ redirect: '/player' });
    expect(decideRoute({ path, user: { ...captain, roleConfirmed: false } })).toEqual({});
  });
  it('matches path segments', () => expect(decideRoute({ path: '/captain-other', user: null })).toEqual({}));
  it('allows an unconfirmed player in the player area', () => {
    expect(decideRoute({ path: '/player', user: { ...player, roleConfirmed: false } })).toEqual({});
  });
});

describe('invite codes', () => {
  it('trims whitespace and preserves case, dashes and underscores from 0003', () => {
    expect(parseInviteCode('  abCd-ef_12345  ')).toBe('abCd-ef_12345');
    expect(parseInviteCode('abcdefghijkl')).toBe('abcdefghijkl');
  });
  it.each(['', 'a b', '../../login', 'a?b', 'a'.repeat(129)])('rejects malformed input %s', (value) => {
    expect(parseInviteCode(value)).toBeNull();
  });
});

describe('form schemas', () => {
  const email = 'coach@example.com';
  it('validates email', () => {
    expect(emailSchema.safeParse({ email: ` ${email} ` }).success).toBe(true);
    expect(emailSchema.safeParse({ email: 'bad' }).success).toBe(false);
  });
  it('validates new passwords', () => {
    expect(passwordSchema.safeParse('abcdefgh1').success).toBe(true);
    for (const value of ['short1', 'abcdefgh', '12345678']) expect(passwordSchema.safeParse(value).success).toBe(false);
  });
  it('allows existing passwords while requiring credentials', () => {
    expect(signInSchema.safeParse({ email, password: 'old' }).success).toBe(true);
    expect(signInSchema.safeParse({ email, password: '' }).success).toBe(false);
  });
  it('requires captain name and a strong password', () => {
    expect(signUpSchema.safeParse({ email, password: 'abcdefgh1', full_name: 'محمد' }).success).toBe(true);
    for (const full_name of ['', 'a'.repeat(81)]) expect(signUpSchema.safeParse({ email, password: 'abcdefgh1', full_name }).success).toBe(false);
    expect(signUpSchema.safeParse({ email, password: 'weak', full_name: 'محمد' }).success).toBe(false);
  });
  it('requires matching reset passwords', () => {
    expect(resetSchema.safeParse({ password: 'abcdefgh1', confirm: 'abcdefgh1' }).success).toBe(true);
    expect(resetSchema.safeParse({ password: 'abcdefgh1', confirm: 'abcdefgh2' }).success).toBe(false);
    expect(resetSchema.safeParse({ password: 'weak', confirm: 'weak' }).success).toBe(false);
  });
  it('requires six digits for OTP', () => {
    expect(otpSchema.safeParse({ email, token: '012345' }).success).toBe(true);
    for (const token of ['12345', '1234567', 'abcdef']) expect(otpSchema.safeParse({ email, token }).success).toBe(false);
  });
});

describe('Arabic error mapping', () => {
  it('does not reveal whether an email exists', () => {
    expect(authError({ code: 'invalid_credentials' })).toBe('الإيميل أو كلمة السر مش مظبوطين');
    expect(authError({ code: 'user_not_found' })).toBe(authError({ code: 'invalid_credentials' }));
  });
  it.each(['email_not_confirmed', 'otp_expired', 'over_email_send_rate_limit', 'weak_password', 'user_already_exists', '42501', 'P0002'])('maps %s', (code) => {
    expect(authError({ code })).toMatch(/[\u0600-\u06ff]/);
  });
  it('hides unknown raw errors', () => {
    expect(authError(new Error('secret English message'))).toBe('حصلت مشكلة، جرّب تاني');
  });
});

describe('auth actions and callback', () => {
  const email = 'player@example.com';
  it('sends captain metadata and handles email confirmation', async () => {
    expect(await signUpCaptain({ email, password: 'abcdefgh1', full_name: 'محمد' })).toHaveProperty('codeEmail', email);
    expect(mocks.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ data: { role: 'captain', full_name: 'محمد' } }) }));
  });
  it('maps password errors and routes successful sessions using profiles', async () => {
    mocks.auth.signInWithPassword.mockResolvedValueOnce({ error: { code: 'invalid_credentials' } });
    expect(await signInPassword({ email, password: 'test' })).toEqual({ error: 'الإيميل أو كلمة السر مش مظبوطين' });
    expect(await signInPassword({ email, password: 'test' })).toEqual({ redirect: '/player' });
  });
  it('sends player OTP metadata, verifies six digits, then redeems', async () => {
    await sendEmailCode({ email });
    expect(mocks.auth.signInWithOtp).toHaveBeenCalledWith({ email, options: { shouldCreateUser: true, data: { role: 'player' } } });
    expect(await verifyEmailCode({ email, token: '012345' }, 'abc')).toEqual({ redirect: '/player/onboarding' });
    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ email, token: '012345', type: 'email' });
    expect(mocks.rpc).toHaveBeenCalledWith('redeem_invite', { p_code: 'abc' });
  });
  it('does not redeem for a captain or after failed verification', async () => {
    mocks.single.mockResolvedValue({ data: { role: 'captain', role_confirmed: true }, error: null });
    expect(await redeemInvite('abc')).toEqual({ error: 'الحساب ده حساب كابتن' });
    mocks.auth.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired' } });
    expect(await verifyEmailCode({ email, token: '012345' }, 'abc')).toHaveProperty('error');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('requests a reset code and validates before updating legacy recovery', async () => {
    await requestReset({ email });
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith(email);
    expect(await updatePassword({ password: 'bad', confirm: 'bad' })).toHaveProperty('error');
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
    expect(await updatePassword({ password: 'abcdefgh1', confirm: 'abcdefgh1' }, 'recovery-code')).toEqual({ redirect: '/login' });
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith('recovery-code');
  });
  it('marks a consumed recovery code so a rejected password can be retried using the session', async () => {
    mocks.auth.updateUser.mockResolvedValueOnce({ error: { code: 'same_password' } });
    expect(await updatePassword({ password: 'abcdefgh1', confirm: 'abcdefgh1' }, 'recovery-code'))
      .toEqual({ error: 'اختار كلمة سر مختلفة', recoveryReady: true });
    expect(await updatePassword({ password: 'abcdefgh2', confirm: 'abcdefgh2' })).toEqual({ redirect: '/login' });
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
  it('persists intent and invite in one short-lived httpOnly cookie', async () => {
    mocks.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/' }, error: null });
    await signInGoogle('player', 'ab-CD');
    expect(mocks.cookie.set).toHaveBeenCalledWith('auth-intent', JSON.stringify({ intent: 'player', code: 'ab-CD' }), expect.objectContaining({ httpOnly: true, maxAge: 600, sameSite: 'lax' }));
  });
  it('exchanges the callback code and confirms a new captain once', async () => {
    mocks.cookie.get.mockReturnValue({ value: JSON.stringify({ intent: 'captain' }) });
    mocks.single.mockResolvedValue({ data: { role: 'player', role_confirmed: false }, error: null });
    const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?code=oauth-code'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/captain');
    expect(mocks.rpc).toHaveBeenCalledWith('confirm_role', { p_role: 'captain' });
    expect(mocks.cookie.delete).toHaveBeenCalledWith('auth-intent');
  });
  it('keeps existing captain roles and never redeems their Google invite', async () => {
    mocks.cookie.get.mockReturnValue({ value: JSON.stringify({ intent: 'player', code: 'invite' }) });
    mocks.single.mockResolvedValue({ data: { role: 'captain', role_confirmed: true }, error: null });
    const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?code=oauth-code'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/i/invite');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('lands a player on intake only after redeeming the callback invite', async () => {
    mocks.cookie.get.mockReturnValue({ value: JSON.stringify({ intent: 'player', code: 'invite' }) });
    const request = new NextRequest('http://localhost:3000/auth/callback?code=oauth-code');
    const response = await handleAuthCallback(request);
    expect(response.headers.get('location')).toBe('http://localhost:3000/player/onboarding');
    expect(mocks.rpc).toHaveBeenCalledWith('redeem_invite', { p_code: 'invite' });
  });
  it('redirects to the public site in production, not the container address', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      mocks.single.mockResolvedValue({ data: { role: 'captain', role_confirmed: true }, error: null });
      const response = await handleAuthCallback(new NextRequest('https://0.0.0.0:8080/auth/callback?code=oauth-code'));
      expect(response.headers.get('location')).toBe('https://kochivo.site/captain');
    } finally { vi.unstubAllEnvs(); }
  });
});

describe('session integration', () => {
  it('routes a suspended session to the blocked screen using the profile lookup', async () => {
    mocks.single.mockResolvedValue({ data: { role: 'captain', role_confirmed: true, suspended_at: '2026-01-01' }, error: null });
    const response = await refreshSession(new NextRequest('http://localhost:3000/captain'), decideRoute);
    expect(response.headers.get('location')).toBe('http://localhost:3000/suspended');
  });
  it('reads the profile once and applies the injected role decision', async () => {
    const response = await refreshSession(new NextRequest('http://localhost:3000/captain'), decideRoute);
    expect(response.headers.get('location')).toBe('http://localhost:3000/player');
    expect(mocks.auth.getClaims).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it('fails closed on a profile query error', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: 'network_error' } });
    const response = await refreshSession(new NextRequest('http://localhost:3000/captain'), decideRoute);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
  });
  it('shows Arabic on server-action transport failure', async () => {
    expect(await callAuthAction(async () => { throw new Error('Failed to fetch'); })).toEqual({ error: 'حصلت مشكلة، جرّب تاني' });
  });
});
