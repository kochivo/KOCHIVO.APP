import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { MyPoints } from './points-schema';
export type { MyPoints } from './points-schema';

export async function loadMyPoints(): Promise<MyPoints> {
  const { points } = await import('./points-schema');
  const db = await loadSupabaseBrowser();
  const { data, error } = await db.rpc('my_points');
  if (error) throw error;
  return points.parse(data);
}
