import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { KoFeedItem } from '../types';

export async function loadFeed(): Promise<KoFeedItem[]> {
  const db = await loadSupabaseBrowser();
  const { data, error } = await db.rpc('ko_feed');
  if (error) throw error;
  const { feedItems } = await import('./feed-schemas');
  return feedItems.parse(data ?? []);
}
