'use server';
import { parseInviteCode } from '../invite-code';
import { authClient, profile, runAction } from './auth-client';

export async function redeemInvite(input: string) {
  return runAction(async () => {
    const code = parseInviteCode(input);
    if (!code) return { error: 'الدعوة مش صالحة أو انتهت' };
    const client = await authClient();
    const user = await profile(client);
    if (user?.role === 'captain') return { error: 'الحساب ده حساب كابتن' };
    if (!user) return { error: 'ادخل حسابك الأول' };
    if (!user.roleConfirmed) {
      const confirmation = await client.rpc('confirm_role', { p_role: 'player' });
      if (confirmation.error) throw confirmation.error;
    }
    const { error } = await client.rpc('redeem_invite', { p_code: code });
    if (error) throw error;
    return { redirect: '/player' };
  });
}
