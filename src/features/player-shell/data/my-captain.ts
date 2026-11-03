'use server';

import { supabaseServer } from '@/core/supabase/server';

export interface MyCaptain {
  fullName: string; phone: string | null; accessUntil: string;
  archivedAt: string | null; startedOn: string | null;
}

export async function fetchMyCaptain(): Promise<{ data: MyCaptain | null } | { error: string }> {
  try {
    const client = await supabaseServer();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return { error: 'سجّل دخولك تاني' };
    const relation = await client.from('coach_clients')
      .select('access_until,archived_at,started_on,captain_id')
      .eq('player_id', auth.user.id).order('archived_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (relation.error) return { error: 'مش قادرين نحمّل بيانات الكابتن' };
    if (!relation.data) return { data: null };
    const row = relation.data;
    const captain = await client.from('profiles').select('full_name,phone').eq('id', row.captain_id).maybeSingle();
    if (captain.error) return { error: 'مش قادرين نحمّل بيانات الكابتن' };
    return { data: {
      fullName: captain.data?.full_name ?? 'الكابتن', phone: captain.data?.phone ?? null,
      accessUntil: row.access_until, archivedAt: row.archived_at, startedOn: row.started_on,
    } };
  } catch { return { error: 'مش قادرين نحمّل بيانات الكابتن' }; }
}
