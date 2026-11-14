import { expect, it } from 'vitest';
import { createT } from '@/core/i18n';
import type { ChatThreadItem } from '@/features/chat';
import { conversationPreview, latestSentMessage } from './conversation-preview';
import { conversationMessages } from './conversation-messages';

const t = createT(conversationMessages, 'ar');
const message: ChatThreadItem = { id: 'm', playerId: 'p', captainId: 'c', senderId: 'p',
  body: 'تمام يا كوتش', audioPath: null, durationSeconds: null, readAt: null,
  createdAt: '2026-11-14T10:00:00Z', source: 'chat', kind: 'text', mine: false, status: 'sent' };
it('previews a voice note with its real duration', () => {
  expect(conversationPreview({ ...message, kind: 'voice', durationSeconds: 18 }, t)).toBe('رسالة صوتية · 0:18');
  expect(conversationPreview({ ...message, kind: 'voice', durationSeconds: 78 }, t)).toBe('رسالة صوتية · 1:18');
});
it('prefixes the captain’s text and voice previews', () => {
  expect(conversationPreview({ ...message, mine: true }, t)).toBe('انت: تمام يا كوتش');
  expect(conversationPreview({ ...message, mine: true, kind: 'voice', durationSeconds: 18 }, t)).toBe('انت: رسالة صوتية · 0:18');
  expect(conversationPreview(message, t)).toBe('تمام يا كوتش');
});
it('uses a translated empty preview', () => {
  expect(conversationPreview(undefined, t)).toBe(t('emptyThread'));
});
it('keeps transient failed and sending messages out of persisted list previews', () => {
  expect(latestSentMessage([message, { ...message, id: 'failed', status: 'failed' },
    { ...message, id: 'sending', status: 'sending' }])).toBe(message);
  expect(latestSentMessage([{ ...message, status: 'failed' }])).toBeUndefined();
});
