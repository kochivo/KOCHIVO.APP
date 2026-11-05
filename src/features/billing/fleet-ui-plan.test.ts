import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { PlanBadge } from './components/plan-badge';
import type { PlanSummary } from './data/plan-summary';

const state = vi.hoisted(() => ({ locale: 'en' as 'en' | 'ar', summary: null as PlanSummary | null }));
vi.mock('./data/plan-summary', () => ({ fetchPlanSummary: async () => state.summary }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('@/core/i18n/server', () => ({
  getLocale: async () => state.locale,
  getT: async () => createT(messages, state.locale),
}));
beforeEach(() => { state.locale = 'en'; state.summary = null; });
const render = async () => renderToStaticMarkup(await PlanBadge());

it.each(['en', 'ar'] as const)('shows fleet usage for every tier in %s', async locale => {
  state.locale = locale;
  for (const [tier, limit] of [['entry', 5], ['champion', 20], ['legend', 40], ['empire', 100]] as const) {
    for (const used of [0, 1, 5, 50, limit, limit + 1]) {
      state.summary = { plan: { tier, player_limit: limit, price_egp: 0 }, used };
      const html = await render();
      expect(html).toContain('href="/captain/billing"');
      const digits = (n: number) => String(n);
      expect(html).toContain(locale === 'en' ? `${digits(used)} of ${digits(limit)} players` : `${digits(used)} من ${digits(limit)} لاعب`);
      expect(html).toContain(used >= limit ? 'text-warn' : 'text-muted');
    }
  }
});
it.each(['en', 'ar'] as const)('shows a retryable error when the summary loader cannot return a plan in %s', async locale => {
  state.locale = locale;
  const html = await render();
  expect(html).toContain('role="alert"');
  expect(html).toContain(locale === 'en' ? 'Try again' : 'جرّب تاني');
  expect(html).toContain('<button');
});
it('reproduces 0 of 0 only with a synthetic zero limit, not with a missing summary', async () => {
  state.locale = 'ar';
  state.summary = { plan: { tier: 'entry', player_limit: 0, price_egp: 0 }, used: 0 };
  expect(await render()).toContain('0 من 0 لاعب');
  state.summary = null;
  expect(await render()).not.toContain('0 من 0 لاعب');
});
