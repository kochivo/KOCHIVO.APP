import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { chatTailAction } from './components/chat-thread-view';
import { ChatThread } from './components/chat-thread';
import type { ChatThreadItem } from './types';

vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-13T10:00:00Z') }) }));
const base: ChatThreadItem = { id: 'a', playerId: 'p', captainId: 'c', senderId: 'p', body: 'hello', audioPath: null,
  durationSeconds: null, readAt: '2026-11-13T09:00:00Z', createdAt: '2026-11-12T08:00:00Z', source: 'chat', kind: 'text', mine: true, status: 'sent' };
const render = (items: ChatThreadItem[]) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(ChatThread, { items, viewer: 'player' })));
it('renders own and incoming bubbles, dates and read receipt only on last read own item', () => {
  const html = render([base, { ...base, id: 'b', mine: false, senderId: 'c', createdAt: '2026-11-13T08:00:00Z' }]);
  expect(html).toContain('rounded-ee-[6px]');
  expect(html).toContain('rounded-es-[6px]');
  expect(html).toContain('أمس');
  expect(html).toContain('النهارده');
  expect(html.match(/>اتقرت</g)).toHaveLength(1);
});
it('renders failed send retry and an empty thread', () => {
  expect(render([{ ...base, status: 'failed' }])).toContain('ما اتبعتتش · جرّب تاني');
  expect(render([])).toContain('ابدأ الكلام مع الكابتن');
});
it('renders the captain empty state', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(ChatThread, { items: [], viewer: 'captain' })));
  expect(html).toContain('لسه مفيش رسايل');
});
it('uses the workspace surfaces for captain bubbles', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(ChatThread, { items: [base], viewer: 'captain' })));
  expect(html).toContain('bg-surface-raised text-ink');
  expect(html).not.toContain('bg-lime font-semibold text-on-lime');
});

it.each(['ar', 'en'] as const)('renders older-page loading and retry states in %s', locale => {
  const page = (olderStatus: 'loading' | 'error') => renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(ChatThread, { items: [base], viewer: 'player', hasOlder: true, olderStatus })));
  expect(page('loading')).toContain('role="status"');
  expect(page('loading')).toContain('disabled');
  expect(page('error')).toContain('role="alert"');
  expect(page('error')).toContain(locale === 'en' ? 'Try again' : 'جرّب تاني');
});

it('protects earlier captain context from incoming messages while following sends', () => {
  expect(chatTailAction('captain', false, false, false)).toBe('notify');
  expect(chatTailAction('captain', false, false, true)).toBe('scroll');
  expect(chatTailAction('captain', false, true, false)).toBe('scroll');
  expect(chatTailAction('captain', true, false, false)).toBe('scroll');
  expect(chatTailAction('player', false, false, false)).toBe('scroll');
});
