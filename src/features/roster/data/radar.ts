'use server';

import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import type { RadarResult } from '../radar';

const reasonSchema = z.enum(['no_activity', 'never_started', 'no_program']);
export async function fetchRadar(today: unknown): Promise<RadarResult> {
  const parsed = z.iso.date().safeParse(today);
  if (!parsed.success) return { error: 'التاريخ مش صحيح' };
  try {
    const client = await supabaseServer();
    const { data, error } = await client.rpc('captain_dropout_radar', { p_today: parsed.data });
    if (error || !data) return { error: 'الرادار مش متاح دلوقتي' };
    return { data: data.map(row => ({ ...row, reason: reasonSchema.parse(row.reason) })) };
  } catch {
    return { error: 'الرادار مش متاح دلوقتي' };
  }
}
