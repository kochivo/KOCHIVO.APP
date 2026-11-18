import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimezoneContext, ViewerTimezoneContext } from '@/core/timezone/client';
import { TimezoneScope } from '@/core/timezone/timezone-scope';
import { PendingForms } from './components/pending-forms';
import { RequestManager } from './components/request-manager';
import { RequestPicker } from './components/request-picker';
import { requestDueAt } from './request-dates';

const due = '2026-01-01T21:30:00Z';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ refresh() {} }) }));
vi.mock('./data/request-actions', () => ({ pendingRequests: vi.fn(), requestPicker: vi.fn(),
  playerRequests: vi.fn(), remindRequest: vi.fn(), requestDetail: vi.fn(), sendRequest: vi.fn(), reviewRequest: vi.fn() }));
vi.mock('@/core/resource', () => ({ useResource: (key: string) => ({
  status: 'ready', retry: async () => undefined,
  data: key.startsWith('pending-forms') ? [{ id: 'r', due_at: due, forms: { title: 'Weekly' } }] : {
    forms: [], requests: [], pending: [{ id: 'r', due_at: due, reminded_at: null, forms: { title: 'Weekly' } }],
  },
}) }));
afterEach(() => vi.unstubAllEnvs());

it.each([PendingForms, RequestManager])('renders due dates using the viewer context', Component => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const render = (zone: string) => renderToStaticMarkup(createElement(TimezoneContext, { value: zone },
    createElement(Component, { locale: 'en', playerId: 'p' })));
  expect(render('Asia/Dubai')).toContain('1/2/2026');
  expect(render('America/New_York')).toContain('1/1/2026');
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  expect(render('Asia/Dubai')).toBe(render('Africa/Cairo'));
});

it('sets the picker minimum date to viewer today around midnight', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const render = (zone: string) => renderToStaticMarkup(createElement(TimezoneContext, { value: zone },
    createElement(RequestPicker, { locale: 'en', playerId: 'p', forms: [], now: new Date(due),
      onSent: () => undefined, onCancel: () => undefined, onSend: async () => true })));
  expect(render('Asia/Dubai')).toContain('min="2026-01-02"');
  expect(render('America/New_York')).toContain('min="2026-01-01"');
});
it('keeps captain request dates on the viewer clock inside a player workspace scope', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const html = renderToStaticMarkup(createElement(ViewerTimezoneContext, { value: 'Asia/Dubai' },
    TimezoneScope({ timezone: 'America/New_York', children: createElement('div', null,
      createElement(RequestManager, { locale: 'en', playerId: 'p' }),
      createElement(RequestPicker, { locale: 'en', playerId: 'p', forms: [], now: new Date(due),
        onSent: () => undefined, onCancel: () => undefined, onSend: async () => true })) })));
  expect(html).toContain('1/2/2026');
  expect(html).toContain('min="2026-01-02"');
});

it.each([
  ['2026-01-01', 'Africa/Cairo', '2026-01-01T21:59:59.000Z'],
  ['2026-01-01', 'Asia/Dubai', '2026-01-01T19:59:59.000Z'],
  ['2026-01-01', 'UTC', '2026-01-01T23:59:59.000Z'],
  ['2026-03-08', 'America/New_York', '2026-03-09T03:59:59.000Z'],
  ['2026-10-25', 'Europe/London', '2026-10-25T23:59:59.000Z'],
])('sets %s deadline at the end of the selected day in %s', (date, zone, expected) => {
  expect(requestDueAt(date, zone)).toBe(expected);
});
it('keeps an omitted deadline optional', () => expect(requestDueAt('', 'UTC')).toBeNull());
