import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { StatusCards } from './status-cards';
import { FileHeader } from './file-header';
import { ProgressSummary } from './progress-summary';
import type { FileSummary, Profile } from './types';
import type { ReactNode } from 'react';

vi.mock('server-only', () => ({}));
vi.mock('@/ui/page-bar-title', () => ({ PageBarTitle: ({ title, subtitle }: { title: string; subtitle: string }) => createElement('h1', null, title, subtitle) }));
vi.mock('@/ui/page-bar-actions', () => ({ PageBarActions: ({ children }: { children: ReactNode }) => children }));
vi.mock('./archive-menu', () => ({ ArchiveMenu: () => null }));
vi.mock('@/features/roster/server', async () => {
  const { lastSeenLabel, playerStatus } = await import('@/features/roster/status');
  const { messages } = await import('@/features/roster/messages');
  return { lastSeenLabel, playerStatus, rosterMessages: messages, archivePlayer: vi.fn() };
});
vi.mock('next/dynamic', () => ({ default: () => () => null }));
const profile: Profile = { name: 'Ali', intake: null, checkIns: [], program: null, nutrition: null };
const summary: FileSummary = { file: { facts: {}, history: [] }, completedDays: 1, lastTraining: '2026-11-12', assessment: null,
  subscription: { access_until: '2026-12-11', started_on: '2026-11-01', pending: false, frozen_at: null, sessions_left: null } };
const input = { playerId: 'p', profile, summary, locale: 'ar' as const, today: '2026-11-12' };
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, element));

it('orders all six real route tabs and renders the player header actions', () => {
  const html = render(createElement(FileHeader, { ...input, tab: 'overview' }));
  const hrefs = [...html.matchAll(/<li><a[^>]*href="([^"]+)"/g)].map(match => match[1]);
  expect(hrefs).toEqual(['/captain/players/p', '/captain/players/p/programs', '/captain/players/p/nutrition', '/captain/players/p/checkins', '/captain/players/p/assessments', '/captain/players/p/chat']);
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  expect(html).toContain('رسالة'); expect(html).toContain('باقي 29 يوم');
  expect(html).toContain('href="/captain/players/p/preview"');
});
it('shows the unread count only when positive on the chat tab', () => {
  const html = render(createElement(FileHeader, { ...input, tab: 'chat', unreadCount: 2 }));
  expect(html).toContain('الشات · 2');
  const empty = render(createElement(FileHeader, { ...input, tab: 'chat', unreadCount: 0 }));
  expect(empty).toContain('>الشات</a>');
  expect(empty).not.toContain('الشات ·');
});
it('renders one primary missing card, then none when every section exists', () => {
  let html = render(createElement(StatusCards, input));
  expect(html.match(/data-primary="true"/g)).toHaveLength(1);
  expect(html).toMatch(/data-primary="true"[^>]*>اعمل برنامج تمرين/);
  const ready: Profile = { ...profile, program: { title: 'Full body', updatedAt: '2026-11-12', days: 3, exercises: 9 },
    nutrition: { title: 'Food', updatedAt: '2026-11-12', meals: 3, kcal: 2100, protein: 150, carbs: 250, fat: 60 } };
  html = render(createElement(StatusCards, { ...input, profile: ready }));
  expect(html.match(/data-primary="true"/g)).toHaveLength(1);
  html = render(createElement(StatusCards, { ...input, profile: ready, summary: { ...summary, assessment: { title: 'Weekly', next: null, last: null } } }));
  expect(html).not.toContain('data-primary="true"');
});
it('shows unavailable weight and no invented goal bar for missing measurements', () => {
  const html = render(createElement(ProgressSummary, input));
  expect(html).toContain('—');
  expect(html.match(/role="progressbar"/g)).toHaveLength(1);
});
