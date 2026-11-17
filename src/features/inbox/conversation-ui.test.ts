import { createElement as h } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { ConversationList } from './components/conversation-list';
import { ConversationBubbles } from './components/conversation-bubbles';
import type { Conversation } from './conversation-types';
import type { ChatThreadItem } from '@/features/chat';

vi.mock('server-only', () => ({}));
const player = { playerId: 'p', fullName: 'علي', accessUntil: '2026-12-01', startedOn: '2026-11-01',
  lastTrainingDate: null, programTitle: null, openTasks: 0 };
const message: ChatThreadItem = { id: 'm', playerId: 'p', captainId: 'c', senderId: 'p',
  body: 'تمام', audioPath: null, durationSeconds: null, readAt: null, createdAt: '2026-11-14T10:00:00Z',
  source: 'chat', kind: 'text', mine: false, status: 'sent' };
const render = (child: ReactElement) => renderToStaticMarkup(h(LocaleProvider, { locale: 'ar' }, child));
it('shows the selected conversation, voice preview and unread pill', () => {
  const rows: Conversation[] = [{ player, latest: { ...message, kind: 'voice', durationSeconds: 18 }, unread: 2 }];
  const html = render(h(ConversationList, { rows, selected: 'p', onSelect() {} }));
  expect(html).toContain('علي');
  expect(html).toContain('رسالة صوتية · 0:18');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('2 رسائل غير مقروءة');
  expect(html).toContain('<time');
  expect(html).toContain('bg-surface-raised border-s-lime');
});
it('hides zero unread pills and supplies an empty state', () => {
  expect(render(h(ConversationList, { rows: [{ player, latest: message, unread: 0 }], onSelect() {} }))).not.toContain('رسائل غير مقروءة');
  expect(render(h(ConversationList, { rows: [], onSelect() {} }))).toContain('مفيش محادثات لسه');
});
it('aligns incoming bubbles at start and lime captain bubbles at end with times', () => {
  const html = render(h(ConversationBubbles, { items: [message, { ...message, id: 'own', mine: true }], now: new Date('2026-11-14T15:00:00Z'), onRetry() {} }));
  expect(html).toContain('self-start');
  expect(html).toContain('self-end');
  expect(html).toContain('bg-lime-soft bg-none text-ink');
  expect(html.match(/dateTime=/gi)).toHaveLength(3);
  expect(html).toContain('النهارده');
});

it('renders one separator for each message day, including older dates', () => {
  const html = render(h(ConversationBubbles, { items: [
    { ...message, id: 'old', createdAt: '2026-11-04T08:51:00Z' },
    { ...message, id: 'yesterday', createdAt: '2026-11-13T21:40:00Z' },
    message,
  ], now: new Date('2026-11-14T15:00:00Z'), onRetry() {} }));
  expect(html).toContain('dateTime="2026-11-04"');
  expect(html).toContain('4 نوفمبر 2026');
  expect(html).toContain('امبارح');
  expect(html).toContain('النهارده');
});
