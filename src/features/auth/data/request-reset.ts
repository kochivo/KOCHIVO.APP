'use server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { authSchemas } from '../schemas';
import { authClient, runAction } from './auth-client';

export async function requestReset(input: unknown) {
  const t = await getT(messages);
  const { emailSchema } = authSchemas(t);
  return runAction(async () => {
    const parsed = emailSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { error } = await (await authClient()).auth.resetPasswordForEmail(parsed.data.email);
    if (error && error.code !== 'user_not_found') throw error;
    return {};
  }, { sendsEmail: true });
}
