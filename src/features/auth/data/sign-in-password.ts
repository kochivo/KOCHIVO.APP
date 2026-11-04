'use server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { homeFor } from '../routing';

import { authSchemas } from '../schemas';
import { authClient, profile, runAction } from './auth-client';

export async function signInPassword(input: unknown) {
  const t = await getT(messages);
  const { signInSchema } = authSchemas(t);
  return runAction(async () => {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const client = await authClient();
    const { error } = await client.auth.signInWithPassword(parsed.data);
    if (error) throw error;
    const user = await profile(client);
    if (!user || (!user.admin && user.role === 'captain' && !user.roleConfirmed)) return { error: t('confirmYourAccountWithGoogle') };
    return { redirect: homeFor(user) };
  });
}
