'use server';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';


import { supabaseServer } from '@/core/supabase/server';

export interface MyCaptain {
  fullName: string; phone: string | null; accessUntil: string;
  archivedAt: string | null; startedOn: string | null;
  bio?: string | null; location?: string | null; avatarUrl?: string | null;
  social?: Partial<Record<'whatsapp' | 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'x', string>>;
}

export async function fetchMyCaptain(): Promise<{ data: MyCaptain | null } | { error: string }> {
  const t = await getT(messages);
  try {
    const client = await supabaseServer();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return { error: t('signInAgain') };
    const relation = await client.from('coach_clients')
      .select('access_until,archived_at,started_on,captain_id')
      .eq('player_id', auth.user.id).order('archived_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (relation.error) return { error: t('couldnTLoadYourCoach') };
    if (!relation.data) return { data: null };
    const row = relation.data;
    const captain = await client.rpc('my_captain_profile');
    if (captain.error) return { error: t('couldnTLoadYourCoach') };
    const publicProfile = captain.data?.[0];
    return { data: {
      fullName: publicProfile?.full_name ?? t('coach'), phone: publicProfile?.phone ?? null,
      bio: publicProfile?.bio, location: publicProfile?.location, social: publicProfile?.social,
      avatarUrl: publicProfile?.avatar_path ? client.storage.from('captain-avatars').getPublicUrl(publicProfile.avatar_path).data.publicUrl : null,
      accessUntil: row.access_until, archivedAt: row.archived_at, startedOn: row.started_on,
    } };
  } catch (error) { unstable_rethrow(error); return { error: t('couldnTLoadYourCoach') }; }
}
