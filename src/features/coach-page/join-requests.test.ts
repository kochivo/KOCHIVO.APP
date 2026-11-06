import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { JoinRequests } from './components/join-requests';

const state = vi.hoisted(() => ({ locale: 'en' as 'en' | 'ar', error: '', rows: [] as { id: string; full_name: string }[] }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, state.locale) }));
vi.mock('./data/join-requests', () => ({ loadJoinRequests: async () => ({ data: state.rows, error: state.error }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
async function render() {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: state.locale }, await JoinRequests()));
}
it.each(['en', 'ar'] as const)('explains where requests appear with an inbox empty state in %s', async locale => {
  state.locale = locale; state.rows = []; state.error = '';
  const html = await render();
  expect(html).toContain(locale === 'en' ? 'Requests from your page link will appear here' : 'أول ما حد يطلب من لينك صفحتك هيظهر هنا');
  expect(html).toContain('lucide-inbox');
  expect(html).toContain('rounded-full border border-dashed');
  expect(html).not.toContain('my-6');
});
it('preserves the request list actions', async () => {
  state.locale = 'en'; state.rows = [{ id: 'request-id', full_name: 'New player' }]; state.error = '';
  const html = await render();
  expect(html).toContain('New player');
  expect(html).toContain('>Accept</button>');
  expect(html).toContain('>Decline</button>');
  expect(html).not.toContain('Requests from your page link');
});
it('keeps read errors inline', async () => {
  state.error = 'Read failed';
  const html = await render();
  expect(html).toContain('role="alert"');
  expect(html).toContain('Read failed');
  expect(html).not.toContain('lucide-inbox');
});
