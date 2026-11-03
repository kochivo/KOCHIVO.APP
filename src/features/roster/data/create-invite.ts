'use server';

import { localDate } from '@/lib/dates';
import { uuidv7 } from '@/core/offline/ids';
import { inviteDaysSchema } from '../invite';
import { rosterClient } from './client';

export async function createInvite(days: unknown): Promise<{ code: string } | { error: string }> {
  const parsed = inviteDaysSchema.safeParse(days);
  if (!parsed.success) return { error: 'اختار 7 أو 30 أو 90 يوم' };
  try {
    const client = await rosterClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return { error: 'سجّل دخولك الأول' };
    const profile = await client.from('profiles').select('role, suspended_at').eq('id', data.user.id).single();
    if (profile.error || profile.data.role !== 'captain') return { error: 'الدعوات للكباتن بس' };
    const today = localDate(new Date());
    const end = new Date(`${today}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + parsed.data);
    const result = await client.from('coach_invites').insert({
      id: uuidv7(), captain_id: data.user.id, access_until: localDate(end, 'UTC'),
    }).select('code').single();
    if (result.error) {
      if (result.error.code === '42501') {
        const current = await client.from('profiles').select('suspended_at').eq('id', data.user.id).single();
        if (current.data?.suspended_at) return { error: 'حسابك موقوف. كلّم الدعم' };
      }
      return { error: 'الدعوة متعملتش. جرّب تاني' };
    }
    return { code: result.data.code };
  } catch { return { error: 'الدعوة متعملتش. جرّب تاني' }; }
}
