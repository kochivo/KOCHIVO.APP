'use server';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { rosterClient } from './client';
import { messages } from '../invites/messages';
import type { InvitePackage } from '../invite-plan';

export async function loadInvitePackages(): Promise<{ packages: InvitePackage[] } | { error: string }> {
  const t = await getT(messages);
  try {
    const client = await rosterClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return { error: t('captainRequired') };
    const result = await client.from('captain_packages').select('id,name,kind,days,sessions,price_egp')
      .eq('captain_id', data.user.id).is('archived_at', null).order('created_at');
    if (result.error) return { error: t('loadError') };
    return { packages: (result.data ?? []).map(pkg => ({ ...pkg, kind: pkg.kind === 'sessions' ? 'sessions' : 'days' })) };
  } catch (error) { unstable_rethrow(error); return { error: t('loadError') }; }
}
