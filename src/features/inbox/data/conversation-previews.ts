'use client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { listMessages, mergeThread, unreadCounts } from '@/features/chat';
import type { ConversationProps, Conversation } from '../conversation-types';

export async function loadConversationPreviews({ players, captainId }: ConversationProps): Promise<Conversation[]> {
  const client = await loadSupabaseBrowser();
  const counts = await unreadCounts(client, captainId);
  return Promise.all(players.map(async player => {
    // Keep list polling bounded; the opened thread loads legacy replies and recordings.
    const messages = await listMessages(client, { playerId: player.playerId, captainId, limit: 1 });
    const items = mergeThread({ messages, voiceNotes: [], replies: [], playerId: player.playerId, captainId, viewerId: captainId });
    return { player, latest: items.at(-1), unread: counts[player.playerId] ?? 0 };
  }));
}
