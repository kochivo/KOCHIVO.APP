import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { PlanBadge } from './components/plan-badge';
import { PlanSidebar } from './components/plan-sidebar';
import type { PlanSummary } from './data/plan-summary';

const state = vi.hoisted(() => ({ locale: 'en' as 'en' | 'ar', summary: null as PlanSummary | null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
beforeEach(() => { state.locale = 'en'; state.summary = null; });
const planData = () => Promise.resolve<[PlanSummary | null, 'en' | 'ar']>([state.summary, state.locale]);
const render = async () => renderToStaticMarkup(await PlanBadge({ data: planData() }));

it.each([0, 3, 5, 7])('shows accessible sidebar usage for %i players with a bounded bar', async used => {
  state.summary = { plan: { tier: 'entry', player_limit: 5, price_egp: 0 }, used };
  const html = renderToStaticMarkup(await PlanSidebar({ data: planData() }));
  expect(html).toContain('href="/captain/billing"');
  expect(html).toContain(`${used} of 5 players`);
  expect(html).toContain('role="progressbar"');
  expect(html).toContain('aria-valuenow="' + Math.min(used, 5) + '"');
  expect(html).toContain('aria-label="');
  expect(html).toContain(used >= 5 ? 'bg-warn' : 'bg-lime');
  expect(html).toContain(used >= 5 ? 'text-warn' : 'text-muted');
  expect(html).toContain(`width:${Math.min(used / 5 * 100, 100)}%`);
});
it('keeps the sidebar plan error retryable', async () => {
  expect(renderToStaticMarkup(await PlanSidebar({ data: planData() }))).toContain('role="alert"');
});

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
