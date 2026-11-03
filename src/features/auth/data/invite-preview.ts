'use server';
import { parseInviteCode } from '../invite-code';
import { authError } from '../errors';
import { authClient, profile } from './auth-client';

export async function invitePreview(input: string) {
  try {
    const code = parseInviteCode(input);
    if (!code) return { error: 'الدعوة مش صالحة أو انتهت' };
    const client = await authClient();
    const user = await profile(client);
    if (user?.role === 'captain') return { error: 'الحساب ده حساب كابتن' };
    const { data, error } = await client.rpc('invite_preview', { p_code: code });
    if (error) throw error;
    const preview = data?.[0];
    if (!preview?.valid) return { error: 'الدعوة مش صالحة أو انتهت' };
    return { captainName: preview.captain_name ?? '', signedIn: !!user };
  } catch (error) { return { error: authError(error) }; }
}
