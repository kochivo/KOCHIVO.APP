import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';

type InviteDatabase = AppDatabase & { public: AppDatabase['public'] & { Functions: {
  create_player_invite_v2: {
    Args: AppDatabase['public']['Functions']['create_player_invite']['Args'] & { p_form_ids: string[]; p_gate: boolean };
    Returns: string;
  } } } };
export function inviteRpc(client: SupabaseClient<AppDatabase>): SupabaseClient<InviteDatabase> {
  return client as SupabaseClient<InviteDatabase>;
}
