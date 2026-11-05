import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainRequests } from './components/captain-requests';

vi.mock('../admin/data/captain-reviews', () => ({ reviewCaptain: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
const render = (rows: Parameters<typeof CaptainRequests>[0]['rows'], error: string | null = null) =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(CaptainRequests, { rows, error })));
it('renders an accessible empty state and pending count', () => {
  expect(render([])).toContain('No captain requests');
  expect(render([])).toContain('Captain requests');
  expect(render([])).toContain('0');
});
it('labels approve and reject per captain and formats signup dates', () => {
  const html = render([{ id: 'c', full_name: 'Ali', email: 'ali@example.com', created_at: '2026-11-03T22:30:00Z' }]);
  expect(html).toContain('aria-label="Approve Ali"');
  expect(html).toContain('aria-label="Reject Ali"');
  expect(html).toContain('ali@example.com');
  expect(html).toContain('4 November 2026');
});
it('renders load errors with a retry action', () => {
  const html = render([], 'Could not load requests');
  expect(html).toContain('role="alert"');
  expect(html).toContain('Try again');
});
