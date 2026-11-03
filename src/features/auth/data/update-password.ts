'use server';
import { unstable_rethrow } from 'next/navigation';
import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { authSchemas } from '../schemas';
import { authError } from '../errors';
import { authClient, runAction } from './auth-client';

export async function updatePassword(input: unknown, recovery?: string | { token_hash?: string; type?: string } | { email: string; token: string }) {
  const t = await getT(messages);
  const { resetSchema } = authSchemas(t);
  return runAction(async () => {
    const parsed = resetSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const client = await authClient();
    if (recovery && typeof recovery === 'object' && 'email' in recovery) {
      const otp = authSchemas(t).otpSchema.safeParse(recovery);
      if (!otp.success) return { error: otp.error.issues[0]?.message };
      const verification = await client.auth.verifyOtp({ ...otp.data, type: 'recovery' });
      if (verification.error) return { error: t(verification.error.code === 'otp_expired' ? 'codeExpired' : 'codeWrong') };
    } else if (recovery) {
      try {
        const verification = typeof recovery === 'string'
          ? await client.auth.exchangeCodeForSession(recovery)
          : recovery.token_hash && recovery.type === 'recovery'
            ? await client.auth.verifyOtp({ token_hash: recovery.token_hash, type: 'recovery' })
            : { error: new Error('Invalid recovery link') };
        if (verification.error) throw verification.error;
      } catch (error) {
        unstable_rethrow(error);
        return { error: t('invalidRecoveryLink'), recoveryInvalid: true };
      }
    }
    const { error } = await client.auth.updateUser({ password: parsed.data.password });
    // The exchange code is single-use; retries must use the established session.
    if (error) return { error: authError(error, await getLocale()), recoveryReady: true };
    const logout = await client.auth.signOut();
    if (logout.error) throw logout.error;
    return { redirect: '/login' };
  });
}
