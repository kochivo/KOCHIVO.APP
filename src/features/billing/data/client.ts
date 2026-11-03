import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';
import type { Payment, Plan } from '../types';

type Table<Row> = { Row: { [Key in keyof Row]: Row[Key] }; Insert: never; Update: never; Relationships: [] };
type BillingDatabase = { public: {
  Tables: {
    profiles: Table<{ id: string; role: string; phone: string | null }>;
    player_payments: Table<Payment>;
    plan_tiers: Table<Plan>;
    captain_subscriptions: Table<{ id: string; captain_id: string; tier: string; starts_at: string; ends_at: string }>;
  };
  Views: Record<string, never>;
  Functions: {
    captain_last_payments: { Args: Record<string, never>; Returns: Payment[] };
    current_tier: { Args: { p_captain: string }; Returns: string };
    renew_player: { Args: { p_player: string; p_days: number; p_amount: number | null }; Returns: string };
  };
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };

export async function captainClient() {
  // The shared database types are still a placeholder; keep this schema inside billing.
  const client = await supabaseServer() as unknown as SupabaseClient<BillingDatabase>;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('captain session required');
  const profile = await client.from('profiles').select('role').eq('id', data.user.id).single();
  if (profile.error || profile.data?.role !== 'captain') throw new Error('captain required');
  return { client, captainId: data.user.id };
}
