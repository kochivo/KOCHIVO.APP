import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { NotificationDropdown } from './components/notification-dropdown';

vi.mock('next/navigation', () => ({
  usePathname: () => '/player', useRouter: () => ({ refresh() {} }),
}));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it.each(['0', '1'])('surfaces notification actions only with workspace flag %s enabled', flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-13T10:00:00Z'));
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(NotificationDropdown, { openerId: 'notifications', onClose() {}, notifications: {
      rows: [], count: 0, pending: false, saveError: false, status: 'error',
      refresh: async () => {}, read: async () => true,
    } })));
  const buttons = html.match(/<button[^>]*>/g) ?? [];
  expect(buttons).toHaveLength(3);
  for (const button of buttons) {
    if (flag === '1') expect(button).toContain('glass');
    else {
      expect(button).not.toContain('glass');
      expect(button).not.toContain('press');
    }
  }
});
