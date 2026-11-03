'use server';
import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { authSchemas } from '../schemas';
import { authError } from '../errors';
import { authClient, runAction } from './auth-client';

export async function updatePassword(input: unknown, code?: string) {
  const t = await getT(messages);
  const { resetSchema } = authSchemas(t);
  return runAction(async () => {
    const parsed = resetSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const client = await authClient();
    if (code) {
      const exchange = await client.auth.exchangeCodeForSession(code);
      if (exchange.error) throw exchange.error;
    }
    const { error } = await client.auth.updateUser({ password: parsed.data.password });
    // The exchange code is single-use; retries must use the established session.
    if (error) return { error: authError(error, await getLocale()), recoveryReady: true };
    const logout = await client.auth.signOut();
    if (logout.error) throw logout.error;
    return { redirect: '/login' };
  });
}
