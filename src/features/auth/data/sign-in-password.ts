'use server';
import { signInSchema } from '../schemas';
import { authClient, profile, runAction } from './auth-client';

export async function signInPassword(input: unknown) {
  return runAction(async () => {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const client = await authClient();
    const { error } = await client.auth.signInWithPassword(parsed.data);
    if (error) throw error;
    const user = await profile(client);
    if (!user || (user.role === 'captain' && !user.roleConfirmed)) return { error: 'كمّل تأكيد حسابك من دخول جوجل' };
    return { redirect: user.role === 'captain' ? '/captain' : '/player' };
  });
}
