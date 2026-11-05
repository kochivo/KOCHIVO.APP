import 'server-only';
import { notFound } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';
import type { AppDatabase } from '@/types/app-database';

export async function requireAdmin(): Promise<SupabaseClient<AppDatabase>> {
  try {
    const client = await supabaseServer();
    const { data, error } = await client.rpc('is_admin');
    if (!error && data === true) return client;
  } catch {
    // Transport and configuration failures must conceal the route too.
  }
  notFound();
}
