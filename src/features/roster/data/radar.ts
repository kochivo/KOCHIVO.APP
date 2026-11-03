'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import type { RadarResult } from '../radar';

const reasonSchema = z.enum(['no_activity', 'never_started', 'no_program']);
export async function fetchRadar(today: unknown): Promise<RadarResult> {
  const t = await getT(messages);
  const parsed = z.iso.date().safeParse(today);
  if (!parsed.success) return { error: t('invalidDate') };
  try {
    const client = await supabaseServer();
    const { data, error } = await client.rpc('captain_dropout_radar', { p_today: parsed.data });
    if (error || !data) return { error: t('radarIsUnavailable') };
    return { data: data.map(row => ({ ...row, reason: reasonSchema.parse(row.reason) })) };
  } catch {
    return { error: t('radarIsUnavailable') };
  }
}
