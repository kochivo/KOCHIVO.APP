import { z } from 'zod';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { KoFeedItem } from '../types';

const base = { key: z.string(), player_id: z.string().uuid(), player_name: z.string(), data: z.record(z.string(), z.unknown()) };
const item = z.discriminatedUnion('severity', [
  z.object({ ...base, severity: z.literal('urgent'), kind: z.enum(['join_requested', 'expired', 'expiring', 'sessions_used_up', 'inactive', 'today_workout', 'my_expiring']) }),
  z.object({ ...base, severity: z.literal('generate'), kind: z.enum(['no_program', 'no_nutrition', 'log_meal']) }),
]);
export async function loadFeed(): Promise<KoFeedItem[]> {
  const db = await loadSupabaseBrowser();
  const { data, error } = await db.rpc('ko_feed');
  if (error) throw error;
  return z.array(item).max(8).parse(data ?? []);
}
