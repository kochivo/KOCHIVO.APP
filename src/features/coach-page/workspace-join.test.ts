import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { JoinRequestsList } from './components/join-requests-list';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('./data/join-requests', () => ({ resolveJoinRequest: vi.fn() }));
vi.mock('@/features/billing', () => ({ BillingManagerLoader: () => null }));

function render(rows: { id: string; full_name: string; created_at: string; package_days?: number; package_sessions?: number }[], phone = false) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(JoinRequestsList, { rows, workspace: true, phone, now: Date.parse('2026-11-14T12:00:00Z') })));
}
it('shows the request identity, relative submission time and card actions', () => {
  const html = render([{ id: 'request', full_name: 'عمر خالد', created_at: '2026-11-14T10:00:00Z' }]);
  expect(html).toContain('عمر خالد');
  expect(html).toContain('بعت الطلب');
  expect(html).toContain('قبل ساعتين');
  expect(html).toContain('جديد');
  expect(html).toContain('tone-info');
  expect(html).toContain('اقبل');
  expect(html).toContain('ارفض');
  expect(html).toContain('dateTime="2026-11-14T10:00:00Z"');
  // Pending requests do not expose intake through the existing RPC/RLS.
  for (const label of ['الهدف', 'الجسم', 'أيام التمرين', 'مكان التمرين']) expect(html).not.toContain(label);
});
it('shows known package details and phone actions while retaining the desktop row', () => {
  const html = render([{ id: 'request', full_name: 'عمر خالد', created_at: '2026-11-14T10:00:00Z', package_days: 30, package_sessions: 12 }], true);
  expect(html).toContain('وافق وابدأ');
  expect(html).toContain('من لينك الدعوة');
  expect(html.match(/30 يوم/g)).toHaveLength(2);
  expect(html.match(/12 حصص/g)).toHaveLength(2);
  expect(html).toContain('md:hidden');
  expect(html).toContain('hidden md:');
  expect(html).toContain('اقبل');
});
it('explains the empty list without showing request actions', () => {
  const html = render([]);
  expect(html).toContain('أول ما حد يطلب من لينك صفحتك هيظهر هنا');
  expect(html).not.toContain('<button');
});
