/**
 * PLACEHOLDER until the schema is applied to a Supabase project.
 * Replace with the generated file (T-001): `npx supabase gen types typescript --project-id <id> > src/types/database.ts`.
 * Only the sync RPCs are typed by hand here, because the offline core depends on them.
 * Generated types will declare p_rows as Json; keep transport.ts compiling when swapping.
 */
import type { SyncRows, SyncTable } from '@/core/offline/tables';

type SyncFn = { Args: { p_rows: Array<SyncRows[SyncTable]> }; Returns: undefined };

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      sync_workout_sessions: SyncFn;
      sync_set_logs: SyncFn;
      sync_meal_logs: SyncFn;
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
