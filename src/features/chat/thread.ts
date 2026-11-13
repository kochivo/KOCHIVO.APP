import type { VoiceNote } from '@/features/voice-notes';
import type { ChatMessage, ChatThreadItem } from './types';

type CaptainReply = { id: string; captain_reply: string | null; reviewed_at: string | null };
export function mergeThread(input: {
  messages: readonly ChatMessage[];
  voiceNotes: readonly VoiceNote[];
  replies: readonly CaptainReply[];
  captainId: string;
  viewerId: string;
  playerId: string;
}): ChatThreadItem[] {
  const legacy = { captainId: input.captainId, playerId: input.playerId, senderId: input.captainId,
    mine: input.viewerId === input.captainId, status: 'sent' as const, audioPath: null };
  return [
    ...input.messages.map(message => ({ ...message, source: 'chat' as const,
      kind: message.audioPath ? 'voice' as const : 'text' as const,
      mine: message.senderId === input.viewerId, status: 'sent' as const })),
    ...input.voiceNotes.map(note => ({ ...legacy, id: `voice:${note.id}`, source: 'voice_note' as const,
      kind: 'voice' as const, body: null, url: note.url, durationSeconds: note.durationSeconds,
      readAt: note.listenedAt, createdAt: note.createdAt })),
    ...input.replies.flatMap(reply => reply.captain_reply?.trim() && reply.reviewed_at
      ? [{ ...legacy, id: `reply:${reply.id}`, source: 'captain_reply' as const, kind: 'text' as const,
        body: reply.captain_reply, durationSeconds: null, readAt: null, createdAt: reply.reviewed_at }] : []),
  ].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
}
