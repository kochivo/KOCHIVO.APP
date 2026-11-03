'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';
import { inviteMessageSchema, profileSchema } from '../schema';
import type { SettingsProfile } from '../schema';

type Row = Record<string, unknown>;
type Table<T> = { Row: T; Insert: never; Update: Partial<T>; Relationships: [] };
type ExportTable = 'workout_sessions' | 'set_logs' | 'meal_logs' | 'check_ins' | 'form_checks' |
  'player_intake' | 'coach_clients' | 'programs' | 'nutrition_plans';
type SettingsDatabase = { public: {
  Tables: { profiles: Table<SettingsProfile> } & Record<ExportTable, Table<Row>>;
  Views: Record<string, never>;
  Functions: {
    request_account_deletion: { Args: Record<string, never>; Returns: string };
    cancel_account_deletion: { Args: Record<string, never>; Returns: undefined };
  };
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };
type Result<T> = { data: T; error?: never } | { error: string; data?: never };
const failure = 'مش قادرين نحفظ التغيير. جرّب تاني';

async function ownSession() {
  // The shared database types are a placeholder; keep the new schema scoped to this feature.
  const client = await supabaseServer() as unknown as SupabaseClient<SettingsDatabase>;
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('unauthenticated');
  return { client, id: auth.data.user.id };
}

export async function loadSettings(): Promise<Result<SettingsProfile>> {
  try {
    const { client, id } = await ownSession();
    const result = await client.from('profiles').select('*').eq('id', id).single();
    if (result.error || !result.data) return { error: 'مش قادرين نحمّل الإعدادات. جرّب تاني' };
    return { data: result.data };
  } catch { return { error: 'مش قادرين نحمّل الإعدادات. جرّب تاني' }; }
}

export async function saveProfile(input: unknown): Promise<Result<SettingsProfile>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? failure };
  try {
    const { client, id } = await ownSession();
    const result = await client.from('profiles').update(parsed.data).eq('id', id).select('*').single();
    if (result.error || !result.data) return { error: failure };
    return { data: result.data };
  } catch { return { error: failure }; }
}

export async function saveInviteMessage(input: unknown): Promise<Result<SettingsProfile>> {
  const parsed = inviteMessageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? failure };
  try {
    const { client, id } = await ownSession();
    const profile = await client.from('profiles').select('*').eq('id', id).single();
    if (profile.error || !profile.data) return { error: failure };
    if (profile.data.role !== 'captain') return { error: 'رسالة الدعوة للكابتن بس' };
    const result = await client.from('profiles').update(parsed.data).eq('id', id).eq('role', 'captain').select('*').single();
    if (result.error || !result.data) return { error: failure };
    return { data: result.data };
  } catch { return { error: failure }; }
}

export async function requestDeletion(): Promise<Result<string>> {
  try {
    const { client } = await ownSession();
    const result = await client.rpc('request_account_deletion', {});
    if (result.error || !result.data) return { error: failure };
    return { data: result.data };
  } catch { return { error: failure }; }
}

export async function cancelDeletion(): Promise<Result<null>> {
  try {
    const { client } = await ownSession();
    const result = await client.rpc('cancel_account_deletion', {});
    return result.error ? { error: failure } : { data: null };
  } catch { return { error: failure }; }
}

export async function exportMyData(): Promise<Result<{ profile: Row; rows: Record<string, Row[]> }>> {
  try {
    const { client, id } = await ownSession();
    const profile = await client.from('profiles').select('*').eq('id', id).single();
    if (profile.error || !profile.data) return { error: 'مش قادرين ننزّل بياناتك. جرّب تاني' };
    const captain = profile.data.role === 'captain';
    const tables: ExportTable[] = captain ? ['coach_clients', 'programs', 'nutrition_plans'] :
      ['workout_sessions', 'set_logs', 'meal_logs', 'check_ins', 'form_checks', 'player_intake'];
    const entries = await Promise.all(tables.map(async (table) => {
      const rows: Row[] = [];
      // PostgREST caps each response; page so larger histories are not silently truncated.
      for (let offset = 0; ; offset += 500) {
        const order = table === 'player_intake' ? 'player_id' : 'id';
        const result = await client.from(table).select('*').eq(captain ? 'captain_id' : 'player_id', id)
          .order(order).range(offset, offset + 499);
        if (result.error) throw new Error('export failed');
        rows.push(...(result.data ?? []));
        if (!result.data || result.data.length < 500) break;
      }
      return [table, rows] as const;
    }));
    return { data: { profile: { ...profile.data }, rows: Object.fromEntries(entries) } };
  } catch { return { error: 'مش قادرين ننزّل بياناتك. جرّب تاني' }; }
}
