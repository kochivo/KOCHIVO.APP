'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { authSchemas } from '../schemas';
import { homeFor } from '../routing';
import { authClient, profile, runAction } from './auth-client';

export async function sendSignInEmailCode(input: unknown) {
  const t = await getT(messages);
  return runAction(async () => {
    const parsed = authSchemas(t).emailSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { email } = parsed.data;
    const { error } = await (await authClient()).auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    // Auth can reject unknown addresses when account creation is disabled. Keep both paths indistinguishable.
    if (error && !['user_not_found', 'signup_disabled', 'otp_disabled'].includes(error.code ?? '')) throw error;
    return { codeEmail: email, message: t('emailCodeNeutral') };
  });
}

export async function verifySignInEmailCode(input: unknown) {
  const t = await getT(messages);
  return runAction(async () => {
    const parsed = authSchemas(t).otpSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const client = await authClient();
    const { error } = await client.auth.verifyOtp({ ...parsed.data, type: 'email' });
    if (error) throw error;
    const user = await profile(client);
    if (!user || (!user.admin && user.role === 'captain' && !user.roleConfirmed)) return { error: t('confirmYourAccountWithGoogle') };
    return { redirect: homeFor(user) };
  });
}
