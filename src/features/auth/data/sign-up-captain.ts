'use server';
import { signUpSchema } from '../schemas';
import { authClient, runAction, siteOrigin } from './auth-client';

export async function signUpCaptain(input: unknown) {
  return runAction(async () => {
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { email, password, full_name } = parsed.data;
    const client = await authClient();
    const { data, error } = await client.auth.signUp({ email, password, options: {
      data: { role: 'captain', full_name }, emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    } });
    if (error) throw error;
    return data.session ? { redirect: '/captain' } : { message: 'شوف إيميلك عشان تأكد حسابك وتدخل' };
  });
}
