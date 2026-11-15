import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export type CycleSettings = {
  enabled: boolean; asked_at: string | null; avg_cycle_days: number; avg_period_days: number;
  light_days: number; photos_captain: boolean; photos_share: boolean;
};
export type CycleData = { female: boolean; settings: CycleSettings; starts: string[]; overrides: string[]; failed?: boolean };
export const defaultCycleSettings: CycleSettings = {
  enabled: false, asked_at: null, avg_cycle_days: 28, avg_period_days: 5,
  light_days: 2, photos_captain: true, photos_share: false,
};
export async function loadCycle(playerId: string): Promise<CycleData> {
  const client = await loadSupabaseBrowser();
  const intake = await client.from('player_intake').select('sex').eq('player_id', playerId).maybeSingle();
  if (intake.error) throw intake.error;
  if (intake.data?.sex !== 'female') return { female: false, settings: defaultCycleSettings, starts: [], overrides: [] };
  const [settings, logs, overrides] = await Promise.all([
    client.from('cycle_settings').select('*').eq('player_id', playerId).maybeSingle(),
    client.from('cycle_logs').select('start_date').eq('player_id', playerId).order('start_date', { ascending: false }).limit(60),
    client.from('cycle_overrides').select('day').eq('player_id', playerId).order('day', { ascending: false }).limit(60),
  ]);
  if (settings.error || logs.error || overrides.error) return { female: true, settings: defaultCycleSettings, starts: [], overrides: [], failed: true };
  return { female: true, settings: settings.data ?? defaultCycleSettings,
    starts: (logs.data ?? []).map(row => row.start_date), overrides: (overrides.data ?? []).map(row => row.day) };
}
export async function writeCycle(playerId: string, patch: Partial<CycleSettings>) {
  const client = await loadSupabaseBrowser();
  const { error } = await client.from('cycle_settings').upsert({ player_id: playerId, ...patch });
  if (error) throw new Error('cycle write failed');
}
export async function logCycle(playerId: string, date: string, override = false, remove = false) {
  const client = await loadSupabaseBrowser();
  const { error } = remove ? override
    ? await client.from('cycle_overrides').delete().eq('player_id', playerId).eq('day', date)
    : await client.from('cycle_logs').delete().eq('player_id', playerId).eq('start_date', date)
    : override ? await client.from('cycle_overrides').upsert({ player_id: playerId, day: date })
      : await client.from('cycle_logs').upsert({ player_id: playerId, start_date: date });
  if (error) throw new Error('cycle write failed');
}
