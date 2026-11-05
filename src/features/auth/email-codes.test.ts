import { beforeEach, expect, it, vi } from 'vitest';
import { signUpCaptain, verifyCaptainCode, resendCaptainCode } from './data/sign-up-captain';
import { updatePassword } from './data/update-password';
import { resendRemaining } from './resend-cooldown';

const { auth, rpc } = vi.hoisted(() => ({
  auth: { signUp: vi.fn(), verifyOtp: vi.fn(), resend: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), getClaims: vi.fn() },
  rpc: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn(), delete: vi.fn() }), headers: async () => new Headers() }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ auth, rpc,
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'player', role_confirmed: false }, error: null }) }) }) }),
}) }));
const email = 'coach@example.com';
const password = { password: 'abcdefgh1', confirm: 'abcdefgh1' };
beforeEach(() => {
  vi.resetAllMocks();
  for (const method of Object.values(auth)) method.mockResolvedValue({ data: {}, error: null });
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'user' } }, error: null });
  rpc.mockResolvedValue({ error: null });
});

it('opens the signup code step when confirmation is required', async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  expect(await signUpCaptain({ email, password: password.password, full_name: 'Coach' })).toHaveProperty('codeEmail', email);
});
it('verifies a signup code and confirms the captain role before continuing', async () => {
  expect(await verifyCaptainCode({ email, token: '123456' })).toEqual({ redirect: '/captain/pending' });
  expect(auth.verifyOtp).toHaveBeenCalledWith({ email, token: '123456', type: 'signup' });
  expect(rpc).toHaveBeenCalledWith('confirm_role', { p_role: 'captain' });
});
it('keeps a failed signup code on the code step without confirming a role', async () => {
  auth.verifyOtp.mockResolvedValue({ error: { code: 'otp_disabled' } });
  expect(await verifyCaptainCode({ email, token: '123456' })).toHaveProperty('error');
  expect(rpc).not.toHaveBeenCalled();
});
it('resends signup confirmation rather than a player sign-in code', async () => {
  expect(await resendCaptainCode({ email })).toEqual({});
  expect(auth.resend).toHaveBeenCalledWith({ email, type: 'signup' });
});
it('verifies a recovery code before updating and signs out afterward', async () => {
  expect(await updatePassword(password, { email, token: '123456' })).toEqual({ redirect: '/login' });
  expect(auth.verifyOtp).toHaveBeenCalledWith({ email, token: '123456', type: 'recovery' });
  expect(auth.verifyOtp.mock.invocationCallOrder[0]).toBeLessThan(auth.updateUser.mock.invocationCallOrder[0] ?? 0);
  expect(auth.signOut).toHaveBeenCalledOnce();
});
it.each([['otp_expired', 'الكود خلص، اطلب كود جديد'], ['validation_failed', 'الكود غلط']])('rejects recovery error %s without changing the password', async (code, error) => {
  auth.verifyOtp.mockResolvedValue({ error: { code } });
  expect(await updatePassword(password, { email, token: '123456' })).toEqual({ error });
  expect(auth.updateUser).not.toHaveBeenCalled();
});
it('validates the code and password before contacting Auth', async () => {
  expect(await updatePassword(password, { email, token: '123' })).toHaveProperty('error');
  expect(await updatePassword({ ...password, confirm: 'different' }, { email, token: '123456' })).toHaveProperty('error');
  expect(auth.verifyOtp).not.toHaveBeenCalled();
});
it('retries a rejected password using the session without consuming the recovery code twice', async () => {
  auth.updateUser.mockResolvedValueOnce({ error: { code: 'same_password' } });
  expect(await updatePassword(password, { email, token: '123456' })).toHaveProperty('recoveryReady', true);
  expect(auth.signOut).not.toHaveBeenCalled();
  expect(await updatePassword({ password: 'abcdefgh2', confirm: 'abcdefgh2' })).toEqual({ redirect: '/login' });
  expect(auth.verifyOtp).toHaveBeenCalledOnce();
});
it('allows resend only after sixty seconds using an injected clock', () => {
  expect(resendRemaining(1000, () => 1000)).toBe(60);
  expect(resendRemaining(1000, () => 60999)).toBe(1);
  expect(resendRemaining(1000, () => 61000)).toBe(0);
  expect(resendRemaining(1000, () => 90000)).toBe(0);
});
