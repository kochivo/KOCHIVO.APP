'use server';
import { resetSchema } from '../schemas';
import { authError } from '../errors';
import { authClient, runAction } from './auth-client';

export async function updatePassword(input: unknown, code?: string) {
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
    if (error) return { error: authError(error), recoveryReady: true };
    const logout = await client.auth.signOut();
    if (logout.error) throw logout.error;
    return { redirect: '/login' };
  });
}
