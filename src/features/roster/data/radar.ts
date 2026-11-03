'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import type { RadarPlayer, RadarResult } from '../radar';

type RadarDatabase = { public: {
  Tables: Record<string, never>; Views: Record<string, never>;
  Functions: { captain_dropout_radar: { Args: { p_today: string }; Returns: RadarPlayer[] } };
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };

export async function fetchRadar(today: unknown): Promise<RadarResult> {
  const parsed = z.iso.date().safeParse(today);
  if (!parsed.success) return { error: 'التاريخ مش صحيح' };
  try {
    // Keep the RPC schema local while shared database types are still a placeholder.
    const client = await supabaseServer() as unknown as SupabaseClient<RadarDatabase>;
    const { data, error } = await client.rpc('captain_dropout_radar', { p_today: parsed.data });
    if (error || !data) return { error: 'الرادار مش متاح دلوقتي' };
    return { data };
  } catch {
    return { error: 'الرادار مش متاح دلوقتي' };
  }
}
