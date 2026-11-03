'use server';
import { getT } from '@/core/i18n/server';
import { coachSlug } from '@/lib/coach-slug';
import { messages } from '../messages';
import { authSchemas } from '../schemas';
import { authClient, runAction, siteOrigin } from './auth-client';
import { completeCoachRequest } from './coach-request';

export async function signUpPlayer(input: unknown, rawCoach: string, existing = false) {
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
    if (current.data.user) return { redirect: await completeCoachRequest(client, coach) };
    if (existing) {
      const result = await client.auth.signInWithPassword(parsed.data);
      if (result.error) throw result.error;
      return { redirect: await completeCoachRequest(client, coach) };
    }
    const available = await client.rpc('coach_public_profile', { slug: coach });
    if (available.error || !available.data?.length) return { error: t('coachRequestFailed') };
    const full_name = 'full_name' in parsed.data ? parsed.data.full_name : '';
    const result = await client.auth.signUp({ email: parsed.data.email, password: parsed.data.password,
      options: { data: { role: 'player', full_name },
        emailRedirectTo: `${await siteOrigin()}/auth/callback?coach=${coach}` } });
    if (result.error) throw result.error;
    return result.data.session ? { redirect: await completeCoachRequest(client, coach) } : { message: t('confirmCoachRequest') };
  });
}
