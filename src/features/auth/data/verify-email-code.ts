'use server';
import { otpSchema } from '../schemas';
import { authClient, runAction } from './auth-client';
import { redeemInvite } from './redeem-invite';

export async function verifyEmailCode(input: unknown, code: string) {
  return runAction(async () => {
    const parsed = otpSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { error } = await (await authClient()).auth.verifyOtp({ ...parsed.data, type: 'email' });
    if (error) throw error;
    return redeemInvite(code);
  });
}
