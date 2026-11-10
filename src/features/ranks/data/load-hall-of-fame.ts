import { loadSupabaseBrowser } from '@/core/supabase/lazy';

import type { HallOfFameRow } from './hall-of-fame-schema';
export type { HallOfFameRow } from './hall-of-fame-schema';

export async function loadHallOfFame(): Promise<HallOfFameRow[]> {
  const { hallOfFame } = await import('./hall-of-fame-schema');
  const db = await loadSupabaseBrowser();
  const { data, error } = await db.rpc('crown_hall_of_fame');
  if (error) throw error;
  return hallOfFame.parse(data);
}
