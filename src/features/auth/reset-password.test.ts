import { beforeEach, expect, it, vi } from 'vitest';
import { preparePasswordRecovery, updatePassword } from './data/update-password';

const auth = vi.hoisted(() => ({ getUser: vi.fn(), verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ auth }) }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
const password = { password: 'abcdefgh1', confirm: 'abcdefgh1' };
beforeEach(() => {
  vi.resetAllMocks();
  for (const method of Object.values(auth)) method.mockResolvedValue({ data: {}, error: null });
});

it('flags an expired recovery link before checking the password', async () => {
  auth.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired' } });
  const recovery = { token_hash: 'expired', type: 'recovery' };
  expect(await preparePasswordRecovery(recovery)).toMatchObject({ recoveryInvalid: true });
  expect(await updatePassword({}, recovery)).toMatchObject({ recoveryInvalid: true });
  expect(auth.updateUser).not.toHaveBeenCalled();
});

it('continues an existing recovery session and rejects a missing session', async () => {
  auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'recovered' } } })
    .mockResolvedValueOnce({ data: { user: null } });
  expect(await preparePasswordRecovery()).toEqual({ recoveryReady: true });
  expect(await preparePasswordRecovery()).toMatchObject({ recoveryInvalid: true });
});

it('verifies a recovery hash before updating without a PKCE verifier', async () => {
  expect(await updatePassword(password, { token_hash: 'hash', type: 'recovery' })).toEqual({ redirect: '/login' });
  expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash', type: 'recovery' });
  expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(auth.updateUser).toHaveBeenCalledWith({ password: 'abcdefgh1' });
  expect(auth.verifyOtp.mock.invocationCallOrder[0]).toBeLessThan(auth.updateUser.mock.invocationCallOrder[0] ?? 0);
});

it.each(['otp_expired', 'flow_state_not_found'])('offers a new link for %s', async (code) => {
  auth.verifyOtp.mockResolvedValue({ error: { code } });
  expect(await updatePassword(password, { token_hash: 'used', type: 'recovery' })).toEqual({
    error: 'اللينك ده مينفعش. اطلب لينك جديد وافتحه من نفس الموبايل أو الكمبيوتر', recoveryInvalid: true,
  });
  expect(auth.updateUser).not.toHaveBeenCalled();
});

it('handles a thrown missing PKCE verifier with the new-link action', async () => {
  auth.exchangeCodeForSession.mockRejectedValue(new Error('PKCE code verifier not found'));
  expect(await updatePassword(password, 'old-code')).toHaveProperty('recoveryInvalid', true);
  expect(auth.updateUser).not.toHaveBeenCalled();
});

it('keeps the verified session for retries after a rejected password', async () => {
  auth.updateUser.mockResolvedValueOnce({ error: { code: 'same_password' } });
  expect(await updatePassword(password, { token_hash: 'hash', type: 'recovery' })).toHaveProperty('recoveryReady', true);
  expect(await updatePassword(password)).toEqual({ redirect: '/login' });
  expect(auth.verifyOtp).toHaveBeenCalledTimes(1);
});

it('rejects non-recovery hashes without updating', async () => {
  expect(await updatePassword(password, { token_hash: 'hash', type: 'signup' })).toHaveProperty('recoveryInvalid', true);
  expect(auth.verifyOtp).not.toHaveBeenCalled();
  expect(auth.updateUser).not.toHaveBeenCalled();
});
