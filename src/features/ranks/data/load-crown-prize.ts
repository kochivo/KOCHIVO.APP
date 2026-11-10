import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { localDate } from '@/lib/dates';

export async function loadCrownPrize(month?: string, now = new Date()): Promise<string | null> {
  const db = await loadSupabaseBrowser();
  const date = month ?? `${localDate(now).slice(0, 7)}-01`;
  const { data, error } = await db.from('crown_prizes').select('prize').eq('month', date).maybeSingle();
  if (error) throw error;
  return data?.prize ?? null;
}
