import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { Conversation } from './conversation-types';
import { ConversationScreen } from './components/conversation-screen';

const state = vi.hoisted(() => ({ desktop: false, rows: undefined as Conversation[] | undefined, error: false }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('next/dynamic', () => ({ default: () => () => h('div', { 'data-chat-pane': true }) }));
vi.mock('@/ui/page-bar-title', () => ({ PageBarTitle: ({ title }: { title: string }) => h('span', { 'data-page-bar': true }, title) }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: state.rows, error: state.error, retry() {} }) }));
vi.mock('./data/conversation-previews', () => ({ loadConversationPreviews() {} }));
vi.mock('./hooks/use-conversation-desktop', () => ({ useConversationDesktop: () => state.desktop }));
const player = { playerId: 'p', fullName: 'علي', accessUntil: '2026-12-01', startedOn: '2026-11-01',
  lastTrainingDate: null, programTitle: null, openTasks: 0 };
const render = () => renderToStaticMarkup(h(LocaleProvider, { locale: 'ar' }, h(ConversationScreen, {
  players: [player], captainId: 'c', at: '2026-11-14T10:00:00Z',
})));
beforeEach(() => { state.desktop = false; state.rows = [{ player, unread: 2 }]; state.error = false; });
it('shows the list first on mobile without mounting a thread that could mark messages read', () => {
  const html = render();
  expect(html).toContain('علي');
  expect(html).not.toContain('data-chat-pane');
  expect(html).toContain('md:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]');
});
it('opens the first conversation on desktop and puts the title only in the page bar', () => {
  state.desktop = true;
  const html = render();
  expect(html).toContain('data-chat-pane');
  expect(html).toContain('صندوق الوارد');
  expect(html).not.toContain('type="search"');
  expect(html).toContain('space-y-card-gap md:hidden');
});
it('shows loading and retry states instead of presenting an empty inbox on failure', () => {
  state.rows = undefined;
  expect(render()).toContain('بنحمّل المحادثات');
  state.error = true;
  expect(render()).toContain('مش قادرين نحمّل المحادثات');
  expect(render()).toContain('جرّب تاني');
});
it('shows phone filter controls and a new count alongside the preserved desktop list', () => {
  const html = render();
  expect(html).toContain('مش مقروء');
  expect(html).toContain('صور');
  expect(html).toContain('جداد');
  expect(html).toContain('md:hidden');
  expect(html).toContain('hidden min-w-0 md:block');
  expect(html).toContain('bg-surface-raised border-s-lime');
});
