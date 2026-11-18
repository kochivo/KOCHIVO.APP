import type { Conversation } from '../conversation-types';

export const filters = ['all', 'unread', 'audio', 'photos'] as const;
export type ConversationFilter = typeof filters[number];

export function filterConversations(rows: readonly Conversation[], filter: ConversationFilter) {
  switch (filter) {
    case 'all': return rows;
    case 'unread': return rows.filter(row => row.unread > 0);
    case 'audio': return rows.filter(row => row.latest?.kind === 'voice');
    case 'photos': return [];
  }
}
