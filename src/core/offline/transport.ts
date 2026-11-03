import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';
import type { SyncTransport } from './sync';
import type { SyncRows, SyncTable } from './tables';

/**
 * Real transport: one RPC per table (sync_<table>), defined in the migrations.
 * The RPCs run as the caller (security invoker), so RLS still decides what is accepted,
 * and resolve conflicts by latest client_updated_at.
 */
export function supabaseTransport(supabase: SupabaseClient<Database>): SyncTransport {
  return async (table, rows) => {
    if (rows.length === 0) return;
    // Sync rows are plain JSON-safe objects; spreading supplies Json's structural object type.
    const payload: Json = rows.map((row: SyncRows[SyncTable]) => ({ ...row }));
    const { error } = await supabase.rpc(`sync_${table}`, { p_rows: payload });
    if (error) throw new Error(`${table}: ${error.message}`);
  };
}
