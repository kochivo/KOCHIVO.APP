import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { unreadCounts } from '@/features/chat/server';
import type { RosterPlayer } from '../types';

export async function loadRosterChat(client: SupabaseClient<AppDatabase>, captainId: string, playerIds: string[]) {
  const counts = await unreadCounts(client, captainId);
  const result: Record<string, NonNullable<RosterPlayer['chat']>> = {};
  for (const id of playerIds) result[id] = { unread: counts[id] ?? 0 };
  const missing = new Set(playerIds);
  // Page the shared stream so one busy conversation cannot hide another player's preview,
  // but stop after a few pages: players who never wrote would otherwise force a full scan.
  for (let offset = 0; missing.size && offset < 3000; offset += 1000) {
    const { data, error } = await client.from('chat_messages').select('id,player_id,body,audio_path,created_at')
      .eq('captain_id', captainId).in('player_id', playerIds).order('created_at', { ascending: false })
      .order('id', { ascending: false }).range(offset, offset + 999);
    if (error) throw error;
    for (const row of data ?? []) {
      if (!missing.delete(row.player_id)) continue;
      result[row.player_id] = { unread: counts[row.player_id] ?? 0, body: row.body, voice: Boolean(row.audio_path), createdAt: row.created_at };
    }
    if (!data || data.length < 1000) break;
  }
  return result;
}
