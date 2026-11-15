'use server';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';


import { supabaseServer } from '@/core/supabase/server';
import { internationalEnabled } from '@/lib/international-enabled';
import { profileTimezone } from '@/lib/timezone';

export interface MyCaptain {
  captainId?: string;
  timezone?: string;
  pending?: boolean; frozenAt?: string | null;
  startFormsPending?: boolean;
  fullName: string; phone: string | null; accessUntil: string;
  archivedAt: string | null; startedOn: string | null;
  bio?: string | null; location?: string | null; avatarUrl?: string | null;
  social?: Partial<Record<'whatsapp' | 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'x', string>>;
}

export async function fetchMyCaptain(): Promise<{ data: MyCaptain | null } | { error: string }> {
  const t = await getT(messages);
  try {
    const client = await supabaseServer();
    const { data: auth, error: authError } = await client.auth.getClaims();
    if (authError || !auth?.claims.sub) return { error: t('signInAgain') };
    const [relation, captain, timezone] = await Promise.all([client.from('coach_clients')
      .select('access_until,archived_at,started_on,captain_id,pending,frozen_at')
      .eq('player_id', auth.claims.sub).order('archived_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      client.rpc('my_captain_profile'),
      internationalEnabled() ? client.rpc('my_captain_timezone') : null,
    ]);
    if (relation.error) return { error: t('couldnTLoadYourCoach') };
    if (!relation.data) return { data: null };
    const row = relation.data;
    if (captain.error || timezone?.error) return { error: t('couldnTLoadYourCoach') };
    const startForms = await client.from('form_requests').select('id').eq('player_id', auth.claims.sub)
      .eq('blocks_access', true).is('answered_at', null).limit(1);
    if (startForms.error) return { error: t('couldnTLoadYourCoach') };
    const publicProfile = captain.data?.[0];
    return { data: {
      captainId: row.captain_id,
      fullName: publicProfile?.full_name ?? t('coach'), phone: publicProfile?.phone ?? null,
      ...(internationalEnabled() ? { timezone: profileTimezone(timezone?.data) } : {}),
      bio: publicProfile?.bio, location: publicProfile?.location, social: publicProfile?.social,
      avatarUrl: publicProfile?.avatar_path ? client.storage.from('captain-avatars').getPublicUrl(publicProfile.avatar_path).data.publicUrl : null,
      accessUntil: row.access_until, archivedAt: row.archived_at, startedOn: row.started_on,
      pending: row.pending, frozenAt: row.frozen_at,
      startFormsPending: startForms.data.length > 0,
    } };
  } catch (error) { unstable_rethrow(error); return { error: t('couldnTLoadYourCoach') }; }
}
