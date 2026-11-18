import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { MoneyOwedContent } from './money-owed-content';
import { MoneyOwedEntry } from './money-owed-entry';
import { messages } from './messages';

vi.mock('server-only', () => ({}));
const fake = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/features/billing/server', () => ({ fetchMoneyOwed: fake.load }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'en', getT: async () => createT(messages, 'en') }));
vi.mock('next/navigation', () => ({ unstable_rethrow: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); });

it('shows a retryable error instead of a zero total when the load fails', async () => {
  fake.load.mockRejectedValue(new Error('Unavailable'));
  const html = renderToStaticMarkup(await MoneyOwedContent({ mode: 'billing' }));
  expect(html).toContain('role="alert"');
  expect(html).toContain('Could not load money owed');
  expect(html).toContain('Try again');
  expect(html).not.toContain('Nobody owes money');
});
it('omits the billing task after a successful empty read', async () => {
  fake.load.mockResolvedValue({ total: 0, count: 0, unpriced: 0, rows: [] });
  const html = renderToStaticMarkup(await MoneyOwedContent({ mode: 'billing' }));
  expect(html).toBe('');
});
it('shows overdue and partial amounts as a single list with player links', async () => {
  fake.load.mockResolvedValue({ total: 300, count: 2, unpriced: 1, rows: [
    { playerId: 'p', name: 'Ali', reason: 'partial', amount: 300, since: '2026-11-01', days: 11 },
    { playerId: 'q', name: 'Omar', reason: 'expired', amount: null, since: '2026-11-05', days: 7 },
    { playerId: 'r', name: 'Waiting', reason: 'receipt_pending', amount: 100, since: '2026-11-05', days: 7 },
  ] });
  const html = renderToStaticMarkup(await MoneyOwedContent({ mode: 'billing' }));
  expect(html.match(/<details data-billing-task/g)).toHaveLength(1);
  expect(html).toContain('300 EGP');
  expect(html).toContain('href="/captain/players/q"');
  expect(html).not.toContain('No price');
  expect(html).not.toContain('Waiting');
});
it('provides a translated Suspense fallback and passes the player scope through', async () => {
  const tree = await MoneyOwedEntry({ mode: 'player', playerId: 'p' });
  expect(renderToStaticMarkup(tree.props.fallback)).toContain('Loading money owed');
  expect(tree.props.children.props).toEqual({ mode: 'player', playerId: 'p' });
});
