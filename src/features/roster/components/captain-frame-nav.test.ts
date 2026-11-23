import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainFrameNav } from './captain-frame-nav';

const state = vi.hoisted(() => ({ error: false, path: '/captain/tasks', tasks: 7 as number | null, data: { tasks: null, inbox: 8, join: 6, billing: null } }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path }));
vi.mock('@/core/resource/use-resource', () => ({ useResource: () => state }));
vi.mock('./captain-frame-data', () => ({ loadCaptainFrameCounts: vi.fn() }));
vi.mock('../hooks/use-task-count', () => ({ useTaskCount: () => state.tasks }));
beforeEach(() => { state.error = false; state.path = '/captain/tasks'; state.tasks = 7; });

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
  expect(inboxLinks).toHaveLength(1);
  for (const link of inboxLinks) expect(link).toContain('>8</span>');
});
it('keeps desktop groups and exposes the five phone controls in order', () => {
  const html = render(7);
  expect(html).toContain('hidden min-[760px]:block');
  const phone = html.slice(html.indexOf('data-captain-phone-nav'));
  expect(phone).toMatch(/href="\/captain"[\s\S]*<a\b(?=[^>]*href="\/captain\/tasks")(?=[^>]*aria-current="page")[\s\S]*id="captain-quick-add"[\s\S]*href="\/captain\/players"[\s\S]*id="captain-more"/);
  expect(phone).toContain('md:hidden');
});
it('retains tasks when polling fails and accepts a fresh endpoint count', () => {
  state.error = true;
  expect(render(7)).not.toContain('العدد مش متاح');
  for (const link of taskLinks(render(7))) expect(link).toContain('>7</span>');
  state.error = false;
  state.tasks = 9;
  for (const link of taskLinks(render(99))) expect(link).toContain('>9</span>');
});
it('shows the badge for two pending tasks and hides it for zero', () => {
  state.tasks = 2;
  for (const link of taskLinks(render(99))) expect(link).toContain('>2</span>');
  state.tasks = 0;
  expect(render(99)).not.toContain('العدد مش متاح');
  for (const link of taskLinks(render(99))) expect(link).not.toMatch(/>\d+<\/span>/);
});
it('keeps the badge unknown before the first successful endpoint read', () => {
  state.tasks = null;
  expect(render(99)).not.toContain('العدد مش متاح');
  for (const link of taskLinks(render(99))) expect(link).not.toMatch(/>\d+<\/span>/);
});

it('leaves phone destinations unselected on notifications', () => {
  state.path = '/captain/notifications';
  const html = render(7);
  const phone = html.slice(html.indexOf('data-captain-phone-nav'));
  expect(phone).not.toContain('aria-current');
  expect(phone).not.toContain('nav-slash');
});
