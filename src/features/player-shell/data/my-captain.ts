'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';

export interface MyCaptain {
  fullName: string; phone: string | null; accessUntil: string;
  archivedAt: string | null; startedOn: string | null;
}
type ReadTable<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] };
type CaptainDatabase = { public: {
  Tables: {
    coach_clients: ReadTable<{ player_id: string; captain_id: string; access_until: string; archived_at: string | null; started_on: string; created_at: string }>;
    profiles: ReadTable<{ id: string; full_name: string; phone: string | null }>;
  };
  Views: Record<string, never>; Functions: Record<string, never>;
} };

export async function fetchMyCaptain(): Promise<{ data: MyCaptain | null } | { error: string }> {
  try {
    // The shared database types are still a placeholder; keep this read schema local.
    const client = await supabaseServer() as unknown as SupabaseClient<CaptainDatabase>;
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
