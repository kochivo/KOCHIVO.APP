import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';

interface RosterRow {
  player_id: string; full_name: string; access_until: string; started_on: string;
  last_training_date: string | null; program_title: string | null; open_tasks: number;
}
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
type RosterDatabase = { public: {
  Tables: {
    profiles: Table<{ id: string; full_name: string; role: string; suspended_at: string | null }, never, never>;
    coach_invites: Table<{ code: string }, { id: string; captain_id: string; access_until: string }, never>;
    coach_clients: Table<{ player_id: string; captain_id: string; archived_at: string | null }, never, { archived_at: string }>;
  };
  Views: Record<string, never>;
  Functions: { captain_roster: { Args: Record<string, never>; Returns: RosterRow[] } };
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };

export async function rosterClient() {
  // Keep this feature's schema local until T-001 replaces the shared placeholder types.
  return await supabaseServer() as unknown as SupabaseClient<RosterDatabase>;
}
