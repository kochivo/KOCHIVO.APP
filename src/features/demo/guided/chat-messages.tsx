import { useLocale, useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- T-288 imports shared chat presentation and messages without data barrels. */
import { ChatThreadView } from '@/features/chat/components/chat-thread-view';
import { messages } from '@/features/chat/messages';
import { messages as voiceMessages } from '@/features/voice-notes/messages';
import type { ChatThreadItem } from '@/features/chat/types';
import { ConversationBubbles } from '@/features/inbox/components/conversation-bubbles';
/* eslint-enable no-restricted-imports */
import type { ChatMessage } from './state';
import { DEFAULT_TIMEZONE } from '@/lib/dates';

export function ChatMessages({ messages: rows, phone, at }: { messages: ChatMessage[]; phone: boolean; at: number }) {
  const t = useT(messages), voiceT = useT(voiceMessages), locale = useLocale();
  const items: ChatThreadItem[] = rows.map((row, index) => ({
    id: `demo-message-${index}`, playerId: 'mohamed', captainId: 'captain', senderId: row.from,
    body: row.text, audioPath: null, durationSeconds: null, readAt: null,
    createdAt: '2026-11-15T06:42:00Z', source: 'chat', kind: 'text',
    mine: row.from === (phone ? 'player' : 'captain'), status: 'sent',
  }));
  if (!phone) return <ConversationBubbles items={items} onRetry={() => undefined} />;
  return <ChatThreadView items={items} viewer={phone ? 'player' : 'captain'} t={t} voiceT={voiceT}
    locale={locale} timezone={DEFAULT_TIMEZONE} now={new Date(at)} />;
}
