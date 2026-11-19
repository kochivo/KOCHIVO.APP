import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { WorkspaceTasks } from './components/workspace-tasks';
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar', getT: async (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'ar') }));
vi.mock('server-only', () => ({}));
vi.mock('@/features/roster', () => ({}));
it('renders each task once with only the first primary action', async () => {
  const html = renderToStaticMarkup(await WorkspaceTasks({ tasks: [
    { kind: 'review', count: 2, href: '/captain/inbox' },
    { kind: 'noMealPlan', name: 'Ali', href: '/captain/players/a/nutrition' },
    { kind: 'renew', name: 'Mona', href: '/captain/billing' },
  ] }));
  expect(html).toContain('اعمل إيه النهارده');
  expect(html).toContain('راجع اتنين Check-in');
  expect(html).toContain('ابدأ المراجعة');
  expect(html).toContain('Ali مالوش نظام أكل');
  expect(html).toContain('اعمل نظام');
  expect(html.match(/control-primary /g)).toHaveLength(1);
  expect(html.match(/<a /g)).toHaveLength(3);
});
