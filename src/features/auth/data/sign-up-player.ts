'use server';
import { getT } from '@/core/i18n/server';
import { coachSlug } from '@/lib/coach-slug';
import { messages } from '../messages';
import { authSchemas } from '../schemas';
import { authClient, runAction, siteOrigin } from './auth-client';
import { completeCoachRequest } from './coach-request';
import { packageSelection, selectionQuery } from '../package-selection';

export async function signUpPlayer(input: unknown, rawCoach: string, existing = false, selected?: unknown) {
  const selection = packageSelection(selected);
  const t = await getT(messages);
  return runAction(async () => {
    const coach = coachSlug(rawCoach);
    if (!coach) return { error: t('coachRequestFailed') };
    const schemas = authSchemas(t);
    const parsed = (existing ? schemas.signInSchema : schemas.signUpSchema).safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const client = await authClient();
    // Existing signed-in players can request without re-entering their credentials.
    const current = await client.auth.getUser();
    if (current.data.user) return { redirect: await completeCoachRequest(client, coach, selection) };
    if (existing) {
      const result = await client.auth.signInWithPassword(parsed.data);
      if (result.error) throw result.error;
      return { redirect: await completeCoachRequest(client, coach, selection) };
    }
    const available = await client.rpc('coach_public_profile', { slug: coach });
    if (available.error || !available.data?.length) return { error: t('coachRequestFailed') };
    const full_name = 'full_name' in parsed.data ? parsed.data.full_name : '';
    const result = await client.auth.signUp({ email: parsed.data.email, password: parsed.data.password,
      options: { data: { role: 'player', full_name },
        emailRedirectTo: `${await siteOrigin()}/auth/callback?coach=${coach}${selectionQuery(selection)}` } });
    if (result.error) return runAction(async () => { throw result.error; }, { sendsEmail: true });
    if (!result.data.session && result.data.user?.identities?.length === 0) return { error: t('trySigningInOrResettingYour') };
    return result.data.session ? { redirect: await completeCoachRequest(client, coach, selection) }
      : { codeEmail: parsed.data.email, message: t('confirmCoachRequest') };
  });
}

export async function verifyPlayerCode(input: unknown, rawCoach: string, selected?: unknown) {
  const t = await getT(messages);
  return runAction(async () => {
    const coach = coachSlug(rawCoach);
    if (!coach) return { error: t('coachRequestFailed') };
    const parsed = authSchemas(t).otpSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const client = await authClient();
    const { error } = await client.auth.verifyOtp({ ...parsed.data, type: 'signup' });
    if (error) return { error: t(error.code === 'otp_expired' ? 'codeExpired' : 'codeWrong') };
    // This also confirms an unconfirmed player role before creating the request.
    return { redirect: await completeCoachRequest(client, coach, packageSelection(selected)) };
  });
}
