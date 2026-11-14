import type { RosterPlayer } from '@/features/roster';
import type { ChatThreadItem } from '@/features/chat';

export type Conversation = { player: RosterPlayer; latest?: ChatThreadItem; unread: number };
export type ConversationProps = { players: RosterPlayer[]; captainId: string; at: string; error?: string };
