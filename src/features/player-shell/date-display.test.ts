import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CaptainScreen } from './components/captain-screen';

vi.mock('./hooks/use-my-captain', () => ({ useCaptainContext: () => ({
  status: 'ready', retry() {}, data: { fullName: 'كابتن', phone: null, startedOn: '2026-10-01',
    accessUntil: '2026-11-03', archivedAt: null },
}) }));

it('keeps the full Arabic start and expiry dates', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-03T12:00:00Z'));
  try {
    const html = renderToStaticMarkup(createElement(CaptainScreen));
    expect(html).toContain('dateTime="2026-10-01">1 أكتوبر 2026</time>');
    expect(html).toContain('dateTime="2026-11-03">3 نوفمبر 2026</time>');
  } finally { vi.useRealTimers(); }
});
vi.mock('server-only', () => ({}));
