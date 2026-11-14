import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainNotificationsEntry } from './components/captain-notifications-entry';
import type { useNotifications } from './hooks/use-notifications';

const state = vi.hoisted(() => ({ current: {} as ReturnType<typeof useNotifications> }));
vi.mock('./hooks/use-notifications', () => ({ useNotifications: () => state.current }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }) }));
afterEach(() => vi.restoreAllMocks());

function render(overrides: Partial<ReturnType<typeof useNotifications>> = {}) {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-14T10:00:00Z'));
  state.current = {
    rows: [], count: 0, status: 'ready', pending: false, saveError: false,
    refresh: async () => {}, read: async () => true, ...overrides,
  };
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(CaptainNotificationsEntry)));
}

describe('captain notification list', () => {
  it('shows an empty state', () => {
    expect(render()).toContain('No notifications yet');
  });

  it('shows loading and retryable error states', () => {
    expect(render({ status: 'loading' })).toContain('role="status"');
    expect(render({ status: 'error' })).toContain('Try again');
  });

  it('renders real notification text, relative time, destinations, and unread dots', () => {
    const html = render({ rows: [{
      id: 'notification-1', type: 'join_requested', payload: { name: 'Mariam' },
      created_at: '2026-11-14T09:00:00Z', is_read: false,
    }, {
      id: 'notification-2', type: 'renewal_requested', payload: { name: 'Ahmed' },
      created_at: '2026-11-14T08:00:00Z', is_read: true,
    }] });
    expect(html).toContain('Mariam requested to join');
    expect(html).toContain('1 hours ago');
    expect(html).toContain('href="/captain/join"');
    expect(html).toContain('href="/captain/billing"');
    expect(html.match(/rounded-full bg-lime/g)).toHaveLength(1);
  });

  it('reports read failures without hiding the list', () => {
    const html = render({ saveError: true });
    expect(html).toContain('role="alert"');
    expect(html).toContain('Could not mark as read');
    expect(html).toContain('No notifications yet');
  });
});
