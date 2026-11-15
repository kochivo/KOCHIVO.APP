import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainFrameNav } from './captain-frame-nav';

const state = vi.hoisted(() => ({ error: false, tasks: 7 as number | null, data: { tasks: null, inbox: 8, join: 6, billing: null } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/captain/tasks' }));
vi.mock('@/core/resource/use-resource', () => ({ useResource: () => state }));
vi.mock('./captain-frame-data', () => ({ loadCaptainFrameCounts: vi.fn() }));
vi.mock('../hooks/use-task-count', () => ({ useTaskCount: () => state.tasks }));
beforeEach(() => { state.error = false; state.tasks = 7; });

function render(tasks: number | null) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(CaptainFrameNav, { counts: { tasks, inbox: 3, join: 2, billing: null } })));
}
function taskLinks(html: string) {
  return html.match(/<a\b[^>]*href="\/captain\/tasks"[^>]*>[\s\S]*?<\/a>/g) ?? [];
}
it('uses the endpoint count independently of the chats and joins poll', () => {
  const links = taskLinks(render(99));
  expect(links).toHaveLength(2);
  for (const link of links) expect(link).toContain('>7</span>');
  const inboxLinks = render(7).match(/<a\b[^>]*href="\/captain\/inbox"[^>]*>[\s\S]*?<\/a>/g) ?? [];
  expect(inboxLinks).toHaveLength(2);
  for (const link of inboxLinks) expect(link).toContain('>8</span>');
});
it('retains tasks when polling fails and accepts a fresh endpoint count', () => {
  state.error = true;
  for (const link of taskLinks(render(7))) expect(link).toContain('>7</span>');
  state.error = false;
  state.tasks = 9;
  for (const link of taskLinks(render(99))) expect(link).toContain('>9</span>');
});
it('keeps the badge unknown before the first successful endpoint read', () => {
  state.tasks = null;
  for (const link of taskLinks(render(99))) expect(link).not.toMatch(/>\d+<\/span>/);
});
