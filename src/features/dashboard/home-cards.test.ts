import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { LocaleProvider } from '@/core/i18n/client';
import { HomeNeeds } from './home/home-needs';
import { HomeSideCards } from './home/home-side-cards';
import { HomeTasks } from './home/home-tasks';
import { HomeConfirmations } from './home/home-confirmations';

vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar', getArabicStyle: async () => 'egyptian',
  getT: async (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'ar') }));
const now = new Date('2026-11-12T15:00:00Z');
it('links join confirmations to the join page with names and count, preserving the payment link', async () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, await HomeConfirmations({
    requests: [{ id: 'r1', name: 'عمر خالد' }, { id: 'r2', name: 'مريم سعيد' }],
    payments: [{ id: 'p1', name: 'أحمد' }], paymentsFailed: false,
  })));
  expect(html).toMatch(/<a[^>]*href="\/captain\/join"[^>]*>[\s\S]*عمر خالد[\s\S]*مريم سعيد[\s\S]*>2<\/span><\/a>/);
  expect(html).toContain('href="/captain/billing"');
  expect(html).not.toContain('home-join-requests');
});
it('keeps the form-video category beside its exercise and age', async () => {
  const html = renderToStaticMarkup(await HomeNeeds({ rows: [{ kind: 'form', id: 'f', playerId: 'p', name: 'كريم',
    title: 'Squat 100 kg', at: '2026-11-12T12:00:00Z', flags: [] }], now, failed: false, contacts: new Map() }));
  expect(html).toContain('فيديو أداء · Squat 100 kg · من 3 ساعات');
  expect(html).toContain('href="/captain/inbox"');
});
it('messages absent players on WhatsApp and uses their profile when no phone exists', async () => {
  const rows = ['a', 'b'].map(id => ({ id, playerId: id, name: id, kind: 'absent' as const, days: 5, lastTrainingDate: '2026-11-06' }));
  const html = renderToStaticMarkup(await HomeNeeds({ rows, now, failed: false, contacts: new Map([['a', '+20 100 123 4567']]) }));
  expect(html).toContain('غايب من 5 أيام');
  expect(html).toContain('https://wa.me/201001234567?text=');
  expect(html).toContain('ما اتمرنش من الجمعة');
  expect(html).toContain('href="/captain/players/b"');
  expect(html.match(/>ابعتله<\/a>/g)).toHaveLength(2);
});
it('shows join names with arrival time and expires in two days without a fabricated package duration', async () => {
  const html = renderToStaticMarkup(await HomeSideCards({ ending: [{ playerId: 'p', fullName: 'أحمد', accessUntil: '2026-11-14',
    startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 0 }],
    requests: [{ id: 'r', name: 'عمر خالد', at: '2026-11-12T12:00:00Z' }], now, timezone: 'Africa/Cairo' }));
  expect(html).toContain('هيخلص اشتراكهم');
  expect(html).toContain('بعد يومين');
  expect(html).toContain('لاعب جديد عايز ينضم');
  expect(html).toContain('عمر خالد');
  expect(html).toContain('من 3 ساعات');
  expect(html).not.toContain('شهور');
});
it('gives the zero-player next-steps panel an empty state', async () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, await HomeTasks(
    { players: [], dues: [], today: '2026-11-12', mealPlanPlayers: [], lastPayments: [] })));
  expect(html).toContain('كل حاجة ماشية تمام');
  expect(html).not.toContain('<ul></ul>');
});
it('places the selected package next to the name and leaves old requests name-only', async () => {
  const html = renderToStaticMarkup(await HomeSideCards({ ending: [], requests: [
    { id: 'with', name: 'عمر خالد', at: '2026-11-12T12:00:00Z', package: { days: 90, sessions: null } },
    { id: 'old', name: 'أحمد', at: '2026-11-12T12:00:00Z' },
  ], now, timezone: 'Africa/Cairo' }));
  expect(html).toContain('>عمر خالد · 3 شهور</p>');
  expect(html).toContain('>أحمد</p>');
  expect(html).not.toContain('أحمد ·');
  expect(html).toContain('من 3 ساعات');
});
