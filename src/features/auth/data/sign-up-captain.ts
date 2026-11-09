'use server';
import { getT } from '@/core/i18n/server';
import { cookies } from 'next/headers';
import { messages } from '../messages';
import { messages as signupMessages } from '../signup/messages';
import { homeFor } from '../routing';

import { authSchemas } from '../schemas';
import { authClient, profile, runAction } from './auth-client';

export async function signUpCaptain(input: unknown) {
  const t = await getT(messages);
  const { signUpSchema } = authSchemas(t);
  return runAction(async () => {
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { email, password, full_name } = parsed.data;
    const client = await authClient();
    const { data, error } = await client.auth.signUp({ email, password, options: {
      data: { role: 'captain', full_name },
    } });
    if (error) throw error;
    // Confirmed duplicates can return an obfuscated user without sending an email.
    if (!data.session && data.user?.identities?.length === 0) return { error: t('trySigningInOrResettingYour') };
    (await cookies()).set('auth-intent', JSON.stringify({ intent: 'captain' }), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 3600,
    });
    return data.session ? finishCaptainSignup(client) : { codeEmail: email };
  });
}

async function finishCaptainSignup(client: Awaited<ReturnType<typeof authClient>>) {
  const user = await profile(client);
  if (!user) throw new Error('Missing profile');
  if (!user.admin && user.roleConfirmed && user.role === 'player') {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    (await cookies()).delete('auth-intent');
    return { error: (await getT(signupMessages))('playerAccount') };
  }
  if (!user.admin && !user.roleConfirmed) {
    const { error } = await client.rpc('confirm_role', { p_role: 'captain' });
    if (error) throw error;
    user.role = 'captain';
    user.captainStatus = 'pending';
  }
  (await cookies()).delete('auth-intent');
  return { redirect: homeFor(user) };
}

export async function verifyCaptainCode(input: unknown) {
  const t = await getT(messages);
  return runAction(async () => {
    const parsed = authSchemas(t).otpSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const client = await authClient();
    const { error } = await client.auth.verifyOtp({ ...parsed.data, type: 'signup' });
    if (error) return { error: t(error.code === 'otp_expired' ? 'codeExpired' : 'codeWrong') };
    return finishCaptainSignup(client);
  });
}

export async function resendCaptainCode(input: unknown) {
  const t = await getT(messages);
  return runAction(async () => {
    const parsed = authSchemas(t).emailSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { error } = await (await authClient()).auth.resend({ ...parsed.data, type: 'signup' });
    if (error) throw error;
    return {};
  });
}
