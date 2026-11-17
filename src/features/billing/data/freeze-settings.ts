'use server';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { captainClient } from './client';

export async function loadFreezeSettings() {
  try {
    const { client, captainId } = await captainClient();
    const result = await client.from('captain_freeze_settings').select('default_days').eq('captain_id', captainId).maybeSingle();
    if (result.error) throw result.error;
    return { data: { default_days: result.data?.default_days ?? null }, error: false };
  } catch (error) { unstable_rethrow(error); return { data: null, error: true }; }
}

export async function saveFreezeSettings(input: unknown) {
  const parsed = z.number().int().min(0).max(90).nullable().safeParse(input);
  if (!parsed.success) return { error: true };
  try {
    const { client, captainId } = await captainClient();
    const result = await client.from('captain_freeze_settings').upsert({
      captain_id: captainId, default_days: parsed.data, updated_at: new Date().toISOString(),
    }).select('default_days').single();
    if (result.error) throw result.error;
    return { error: false };
  } catch (error) { unstable_rethrow(error); return { error: true }; }
}
