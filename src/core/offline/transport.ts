import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';
import type { SyncTransport } from './sync';
import type { SyncRows, SyncTable } from './tables';

/**
 * Real transport: one RPC per table (sync_<table>), defined in the migrations.
 * The RPCs run as the caller (security invoker), so RLS still decides what is accepted,
 * and resolve conflicts by latest client_updated_at.
 */
export function supabaseTransport(supabase: SupabaseClient<Database>, owner: string): SyncTransport {
  return async (table, rows) => {
    if (rows.length === 0) return;
    const { localDb } = await import('./db');
    if (localDb().userId !== owner) throw new Error('Sync account changed');
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || data.user?.id !== owner || localDb().userId !== owner) throw new Error('Sync account changed');
    // Sync rows are plain JSON-safe objects; spreading supplies Json's structural object type.
    const payload: Json = rows.map((row: SyncRows[SyncTable]) => ({ ...row }));
    const { error } = await supabase.rpc(`sync_${table}`, { p_rows: payload });
    if (error) throw new Error(`${table}: ${error.message}`);
  };
}
