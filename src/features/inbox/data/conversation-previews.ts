'use client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { ConversationProps, Conversation } from '../conversation-types';

export async function loadConversationPreviews({ players, captainId }: ConversationProps): Promise<Conversation[]> {
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.rpc('inbox_previews');
  if (error) throw error;
  const previews = new Map((data ?? []).map(row => [row.player_id, row]));
  return players.map(player => {
    const row = previews.get(player.playerId);
    const latest: Conversation['latest'] = row?.id && row.created_at && row.sender_id && row.kind ? {
      id: row.id, playerId: player.playerId, captainId, senderId: row.sender_id,
      body: row.body, audioPath: null, durationSeconds: row.duration_seconds,
      readAt: null, createdAt: row.created_at, source: 'chat', kind: row.kind,
      mine: row.sender_id === captainId, status: 'sent',
    } : undefined;
    return { player, latest, unread: row?.unread_count ?? 0 };
  });
}
