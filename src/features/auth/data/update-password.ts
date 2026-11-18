'use server';
import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { authSchemas } from '../schemas';
import { authError } from '../errors';
import { authClient, runAction } from './auth-client';

type Link = string | { token_hash?: string; type?: string };
type Client = Awaited<ReturnType<typeof authClient>>;

async function verifyRecoveryLink(client: Client, recovery: Link) {
  try {
    const result = typeof recovery === 'string'
      ? await client.auth.exchangeCodeForSession(recovery)
      : recovery.token_hash && recovery.type === 'recovery'
        ? await client.auth.verifyOtp({ token_hash: recovery.token_hash, type: 'recovery' })
        : null;
    return !!result && !result.error;
  } catch (error) {
    unstable_rethrow(error);
    return false;
  }
}

export async function preparePasswordRecovery(recovery?: Link) {
  const t = await getT(messages);
  return runAction(async () => {
    const client = await authClient();
    if (recovery !== undefined) {
      if (await verifyRecoveryLink(client, recovery)) return { recoveryReady: true };
    } else {
      const { data, error } = await client.auth.getUser();
      if (data?.user) return { recoveryReady: true };
      if (error && !isAuthSessionMissingError(error) && (error.status === 0 || (error.status ?? 0) >= 500)) throw error;
    }
    return { error: t('invalidRecoveryLink'), recoveryInvalid: true };
  });
}

export async function updatePassword(input: unknown, recovery?: Link | { email: string; token: string }) {
  const t = await getT(messages);
  const { resetSchema } = authSchemas(t);
  return runAction(async () => {
    const client = await authClient();
    const link = typeof recovery === 'string' || (recovery && !('email' in recovery)) ? recovery : undefined;
    if (link !== undefined && !await verifyRecoveryLink(client, link)) {
      return { error: t('invalidRecoveryLink'), recoveryInvalid: true };
    }
    const parsed = resetSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message, ...(link !== undefined ? { recoveryReady: true } : {}) };
    if (recovery && typeof recovery === 'object' && 'email' in recovery) {
      const otp = authSchemas(t).otpSchema.safeParse(recovery);
      if (!otp.success) return { error: otp.error.issues[0]?.message };
      const verification = await client.auth.verifyOtp({ ...otp.data, type: 'recovery' });
      if (verification.error) return { error: t(verification.error.code === 'otp_expired' ? 'codeExpired' : 'codeWrong') };
    }
    const { error } = await client.auth.updateUser({ password: parsed.data.password });
    if (isAuthSessionMissingError(error)) return { error: t('invalidRecoveryLink'), recoveryInvalid: true };
    // The exchange code is single-use; retries must use the established session.
    if (error) return { error: authError(error, t), recoveryReady: true };
    const logout = await client.auth.signOut();
    if (logout.error) throw logout.error;
    return { redirect: '/login' };
  });
}
