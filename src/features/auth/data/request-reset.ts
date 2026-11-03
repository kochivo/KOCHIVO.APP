'use server';
import { emailSchema } from '../schemas';
import { authClient, runAction, siteOrigin } from './auth-client';

export async function requestReset(input: unknown) {
  return runAction(async () => {
    const parsed = emailSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { error } = await (await authClient()).auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${await siteOrigin()}/reset-password`,
    });
    if (error && error.code !== 'user_not_found') throw error;
    return {};
  });
}
