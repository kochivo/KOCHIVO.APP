import { z } from 'zod';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

const winner = z.object({
  month: z.iso.date().refine(value => value.endsWith('-01')),
  player_id: z.uuid().nullable(), display_name: z.string(),
  adherence: z.number().int().min(1).max(100),
  done: z.number().int().min(4), planned: z.number().int().min(8),
});
export type HallOfFameRow = z.infer<typeof winner>;

export async function loadHallOfFame(): Promise<HallOfFameRow[]> {
  const db = await loadSupabaseBrowser();
  const { data, error } = await db.rpc('crown_hall_of_fame');
  if (error) throw error;
  return z.array(winner).max(12).parse(data);
}
