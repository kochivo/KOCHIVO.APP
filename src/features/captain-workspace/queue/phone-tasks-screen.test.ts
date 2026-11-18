import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { CaptainTask } from './tasks-model';
import { TasksScreen } from './tasks-screen';

const viewport = vi.hoisted(() => ({ phone: false, hash: '' }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }) }));
vi.mock('./use-phone-tasks', () => ({
  usePhoneTasks: () => viewport.phone && process.env.NEXT_PUBLIC_CAPTAIN_WORKSPACE === '1',
  usePhoneTaskHash: (phone: boolean) => phone ? viewport.hash : '',
}));
const tasks: CaptainTask[] = [
  { id: 'absent:a', kind: 'absent', name: 'Omar', playerId: 'a', at: '2026-11-10', days: 8 },
  { id: 'program:b', kind: 'program', name: 'Sara', playerId: 'b', at: '2026-11-18' },
];
vi.mock('@/core/resource', () => ({
  useResource: (key: string) => ({
    data: key.startsWith('phone-task-counts:') ? { reviewed: 4 } :
      { tasks, at: '2026-11-18T14:00:00Z', triage: { history: [], dailyChecks: [] } },
  }),
}));

const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(TasksScreen)));
afterEach(() => { vi.unstubAllEnvs(); viewport.phone = false; viewport.hash = ''; });

it('renders the exact same task layout on desktop with the workspace flag on or off', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const desktop = render();
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(render()).toBe(desktop);
  expect(desktop).toContain('min-[760px]:grid-cols-');
  expect(desktop).toContain('Omar');
  expect(desktop).toContain('Sara');
});

it('keeps the original task layout on phones with the flag off', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const original = render();
  viewport.phone = true;
  expect(render()).toBe(original);
});

it('opens the linked task as a single card and offers next and previous controls', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  viewport.phone = true;
  viewport.hash = '#program%3Ab';
  const html = render();
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toMatch(/<header data-captain-phone-heading="true"/);
  expect(html.match(/aria-label="Find a player"/g)).toHaveLength(1);
  expect(html).toContain('data-page-bar-menu');
  expect(html).toContain('2 waiting');
  expect(html).toContain('4 reviewed');
  expect(html).toContain('Sara');
  expect(html).not.toContain('Omar');
  expect(html.match(/<article\b/g)).toHaveLength(1);
  expect(html).toContain('aria-label="Next"');
  expect(html).toContain('aria-label="Previous"');
});
