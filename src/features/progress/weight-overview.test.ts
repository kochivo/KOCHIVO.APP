import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { WeightOverview } from './components/weight-overview';

vi.mock('@/core/offline', () => ({ localDb: () => ({ userId: 'player' }) }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: null, status: 'ready' }) }));

it('shows an actionable error instead of an endless weight skeleton after the first check-in read fails', () => {
  const html = renderToStaticMarkup(createElement(WeightOverview, { checkinError: true, onRetry() {} }));
  expect(html).toContain('role="alert"');
  expect(html).toContain('جرّب تاني');
  expect(html).not.toContain('aria-busy="true"');
});
