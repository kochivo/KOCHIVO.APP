import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { sendSignInEmailCode, verifySignInEmailCode } from './data/sign-in-email-code';

const mock = vi.hoisted(() => ({ send: vi.fn(), verify: vi.fn(), claims: vi.fn(), profile: vi.fn(), admin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'ar') }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { signInWithOtp: mock.send, verifyOtp: mock.verify, getClaims: mock.claims }, rpc: mock.admin,
  from: () => ({ select: () => ({ eq: () => ({ single: mock.profile }) }) }),
}) }));
const email = 'player@example.com';
const neutral = 'لو الإيميل ده عليه حساب، هيوصلك كود';
beforeEach(() => {
  vi.resetAllMocks();
  mock.send.mockResolvedValue({ error: null }); mock.verify.mockResolvedValue({ error: null });
  mock.claims.mockResolvedValue({ data: { claims: { sub: 'player' } }, error: null });
  mock.profile.mockResolvedValue({ data: { role: 'player', role_confirmed: true }, error: null });
  mock.admin.mockResolvedValue({ data: false, error: null });
});
it('sends a sign-in code without creating an account', async () => {
  expect(await sendSignInEmailCode({ email })).toEqual({ codeEmail: email, message: neutral });
  expect(mock.send).toHaveBeenCalledWith({ email, options: { shouldCreateUser: false } });
});
it.each(['user_not_found', 'signup_disabled', 'otp_disabled'])('keeps unknown-email error %s neutral', async code => {
  mock.send.mockResolvedValue({ error: { code } });
  expect(await sendSignInEmailCode({ email })).toEqual({ codeEmail: email, message: neutral });
});
it.each([
  ['player', true, false, 'approved', '/player'], ['captain', true, false, 'approved', '/captain'],
  ['captain', true, false, 'pending', '/captain/pending'], ['player', true, true, 'approved', '/admin'],
] as const)('verifies email OTP and routes %s home', async (role, confirmed, admin, status, destination) => {
  mock.profile.mockResolvedValue({ data: { role, role_confirmed: confirmed, captain_status: status }, error: null });
  mock.admin.mockResolvedValue({ data: admin, error: null });
  expect(await verifySignInEmailCode({ email, token: '123456' })).toEqual({ redirect: destination });
  expect(mock.verify).toHaveBeenCalledWith({ email, token: '123456', type: 'email' });
});
it('keeps the password-sign-in confirmation message for an unconfirmed captain', async () => {
  mock.profile.mockResolvedValue({ data: { role: 'captain', role_confirmed: false }, error: null });
  expect(await verifySignInEmailCode({ email, token: '123456' })).toEqual({ error: messages.ar.confirmYourAccountWithGoogle });
});
it('validates both steps and never reads a profile after failed verification', async () => {
  expect(await sendSignInEmailCode({ email: 'junk' })).toHaveProperty('error');
  expect(await verifySignInEmailCode({ email, token: '123' })).toHaveProperty('error');
  expect(mock.send).not.toHaveBeenCalled(); expect(mock.verify).not.toHaveBeenCalled();
  mock.verify.mockResolvedValue({ error: { code: 'otp_expired' } });
  expect(await verifySignInEmailCode({ email, token: '123456' })).toHaveProperty('error');
  expect(mock.profile).not.toHaveBeenCalled();
});
