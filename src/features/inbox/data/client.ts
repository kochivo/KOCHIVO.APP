import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';

type Base = { id: string; player_id: string; captain_id: string; created_at: string; reviewed_at: string | null; captain_reply: string | null };
type Form = Base & { exercise_id: string; video_path: string; note: string | null };
type Check = Base & { week_start: string; body_weight_kg: number | null; waist_cm: number | null; notes: string | null; photo_paths: string[] };
type Table<R, U = never> = { Row: R; Insert: never; Update: U; Relationships: [] };
type Review = { reviewed_at: string; captain_reply: string | null };
type InboxDatabase = { public: {
  Tables: {
    form_checks: Table<Form, Review>; check_ins: Table<Check, Review>;
    profiles: Table<{ id: string; full_name: string }>;
    exercises: Table<{ id: string; name_ar: string }>;
  };
  Views: Record<string, never>; Functions: Record<string, never>;
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };
export async function inboxClient() {
  // The shared database types are still a placeholder; keep this schema feature-local.
  return await supabaseServer() as unknown as SupabaseClient<InboxDatabase>;
}
