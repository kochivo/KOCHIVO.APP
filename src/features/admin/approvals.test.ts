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
it('reserves filled lime for the first pending approval', () => {
  const html = render(['Ali', 'Mona', 'Omar'].map((full_name, index) => ({
    id: String(index), full_name, email: null, created_at: '2026-11-03T10:00:00Z',
  })));
  const approvals = html.match(/<button[^>]*aria-label="Approve [^"]*"[^>]*>/g) ?? [];
  expect(approvals).toHaveLength(3);
  expect(approvals[0]).toContain('bg-lime');
  for (const button of approvals.slice(1)) {
    expect(button).toContain('glass');
    expect(button).not.toContain('bg-lime');
  }
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
it('shows contacts, translated answers and the missing intake state', () => {
  const row = { id: 'c', full_name: 'Ali', email: null, created_at: '2026-11-03T22:30:00Z' };
  expect(render([row])).toContain('Hasn&#x27;t filled in the details yet');
  const html = render([{ ...row, whatsapp: '+201012345678', instagram: 'ali.coach',
    captain_intake: { current_tool: 'other_app', main_challenge: 'tracking_progress', players_range: '11-50' } }]);
  expect(html).toContain('href="https://wa.me/201012345678"');
  expect(html).toContain('ali.coach');
  expect(html).toContain('Another app');
  expect(html).toContain('Tracking player progress');
  expect(html).toContain('11-50');
});
