import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export async function reviewPoints(id: string, approve: boolean): Promise<void> {
  const db = await loadSupabaseBrowser();
  const { error } = await db.rpc('review_points', { p_id: id, p_approve: approve });
  if (error) throw error;
}
