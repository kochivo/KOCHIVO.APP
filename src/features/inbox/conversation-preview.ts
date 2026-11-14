import type { ChatThreadItem } from '@/features/chat';
import type { Translator } from '@/core/i18n/messages';
import type { conversationMessages } from './conversation-messages';

export const voiceDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export const latestSentMessage = (items: readonly ChatThreadItem[]) => items.findLast(item => item.status === 'sent');
export function conversationPreview(item: ChatThreadItem | undefined, t: Translator<typeof conversationMessages>) {
  if (!item) return t('emptyThread');
  const text = item.kind === 'voice' ? t('voice', { duration: voiceDuration(item.durationSeconds ?? 0) }) : item.body ?? '';
  return item.mine ? t('own', { text }) : text;
}
