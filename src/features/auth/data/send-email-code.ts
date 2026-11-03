'use server';
import { emailSchema } from '../schemas';
import { authClient, runAction } from './auth-client';

export async function sendEmailCode(input: unknown) {
  return runAction(async () => {
    const parsed = emailSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { error } = await (await authClient()).auth.signInWithOtp({ email: parsed.data.email,
      options: { shouldCreateUser: true, data: { role: 'player' } } });
    if (error) throw error;
    return {};
  });
}
