import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';
import type { Intake } from './intake-schema';

export type IntakeDatabase = { public: {
  Tables: { player_intake: {
    Row: Intake & { player_id: string; completed_at: string | null };
    Insert: Intake & { player_id: string; completed_at: string };
    Update: Partial<Intake>;
    Relationships: [];
  } };
  Views: Record<string, never>; Functions: Record<string, never>;
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };

export async function hasIntake(): Promise<boolean> {
  // Keep the table surface local until T-001 replaces the placeholder database types.
  const client = await supabaseServer() as unknown as SupabaseClient<IntakeDatabase>;
  const { data: auth, error: authError } = await client.auth.getClaims();
  if (authError) throw new Error('مش قادرين نتأكد من حسابك. جرّب تاني');
  if (!auth?.claims.sub) throw new Error('ادخل حسابك الأول');
  const { data, error } = await client.from('player_intake').select('player_id')
    .eq('player_id', auth.claims.sub).maybeSingle();
  if (error) throw new Error('مش قادرين نحمّل بياناتك. جرّب تاني');
  return data !== null;
}
