import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { KoFeedItem } from '../types';

export async function snoozeOptimistically(current: () => KoFeedItem[], key: string, show: (rows: KoFeedItem[]) => void, save: () => Promise<void>) {
  const rows = current();
  const item = rows.find(row => row.key === key);
  show(rows.filter(row => row.key !== key));
  try { await save(); return true; }
  catch {
    const latest = current();
    show(item && !latest.some(row => row.key === key) ? [...latest, item] : latest);
    return false;
  }
}

export async function dismissFeedItem(key: string, now: number) {
  const db = await loadSupabaseBrowser();
  const { error } = await db.from('ko_dismissals').upsert({ key, until: new Date(now + 86_400_000).toISOString() }, { onConflict: 'user_id,key' });
  if (error) throw error;
}
