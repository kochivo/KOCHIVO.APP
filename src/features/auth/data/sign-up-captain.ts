'use server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { authSchemas } from '../schemas';
import { authClient, runAction, siteOrigin } from './auth-client';

export async function signUpCaptain(input: unknown) {
  const t = await getT(messages);
  const { signUpSchema } = authSchemas(t);
  return runAction(async () => {
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { email, password, full_name } = parsed.data;
    const client = await authClient();
    const { data, error } = await client.auth.signUp({ email, password, options: {
      data: { role: 'captain', full_name }, emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    } });
    if (error) throw error;
    return data.session ? { redirect: '/captain' } : { message: t('checkYourEmailToConfirmYour') };
  });
}
