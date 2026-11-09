import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export async function decideSwap(id: string, approve: boolean): Promise<void> {
  const db = await loadSupabaseBrowser();
  const { error } = await db.rpc('decide_exercise_swap', { p_id: id, p_approve: approve });
  if (error) throw error;
}

export async function decideSwapOptimistically(id: string, approve: boolean, hide: (hidden: boolean) => void,
  save: typeof decideSwap = decideSwap): Promise<boolean> {
  hide(true);
  try { await save(id, approve); return true; }
  catch { hide(false); return false; }
}
