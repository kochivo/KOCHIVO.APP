import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceScreen } from './components/workspace-screen';
import { WorkspaceCheckin } from './components/workspace-checkin';
import type { WorkspaceInboxData } from './workspace-types';
const state = vi.hoisted(() => ({ data: undefined as WorkspaceInboxData | undefined }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: state.data, retry() {}, mutate() {} }) }));
vi.mock('./data/workspace', () => ({ loadWorkspaceInbox() {}, loadWorkspaceReviews() {}, reviewAssessment() {} }));
vi.mock('./data/inbox', () => ({ reviewItem() {} }));
vi.mock('./hooks/use-inbox-media', () => ({ useInboxMedia: () => ({ urls: [], loading: false, error: false }) }));
const render = () => renderToStaticMarkup(h(LocaleProvider, { locale: 'ar' }, h(WorkspaceScreen, { joinRequests: {} })));
beforeEach(() => {
  state.data = { items: [], triage: { history: [], dailyChecks: [] }, at: '2026-11-12T10:00:00Z', more: false, limit: 50,
    weekAt: '2026-11-06T22:00:00Z', reviews: { more: false, cursor: null, total: 0 } };
});
it('renders one search, one status group and all five types with no embedded queue', () => {
  const html = render();
  expect(html.match(/type="search"/g)).toHaveLength(1);
  for (const label of ['مستنيين ردك', 'متأخرين', 'خلصوا', 'الكل', 'متابعات', 'فيديوهات أداء', 'تقييمات', 'طلبات انضمام']) expect(html).toContain(label);
  expect(html).toContain('المتابعة');
  expect(html).not.toContain('أدوات المتابعة');
  expect(html).not.toContain('لا توجد بيانات بعد');
  expect(html).toMatch(/<details[^>]*>/);
  expect(html).not.toMatch(/<details[^>]*open/);
});
it('shows completion only when the entire pending queue is empty and omits unknown average', () => {
  expect(render()).toContain('خلصت كل المتابعات');
  expect(render()).not.toContain('المتوسط');
  if (state.data) state.data.more = true;
  expect(render()).not.toContain('خلصت كل المتابعات');
});
it('puts KPI tiles and flagged answers before photos, and leaves unsupported food adherence blank', () => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(WorkspaceCheckin, {
    item: { kind: 'checkin', id: 'c', player_id: 'p', player_name: 'Ali', created_at: '2026-11-10T10:00:00Z',
      week_start: '2026-11-07', body_weight_kg: 82.4, waist_cm: 91, notes: 'Tired', reviewed_at: null, reply: null },
    inputs: { history: [], dailyChecks: ['08', '09', '10'].map(day => ({ player_id: 'p', log_date: `2026-11-${day}`, sleep_hours: 5, soreness: 4, deleted_at: null })) },
    now: new Date('2026-11-12T10:00:00Z'),
  })));
  expect(html).toContain('Food adherence');
  expect(html).toContain('text-warn');
  expect(html.indexOf('Food adherence')).toBeLessThan(html.indexOf('No photos'));
  expect(html).not.toContain('vs last week');
});
it('keeps exact status totals on a partially loaded queue', () => {
  if (!state.data) throw new Error('fixture missing');
  state.data.counts = { all: 201, checkin: 100, form: 100, assessment: 1, request: 0 };
  state.data.statusCounts = { overdue: { all: 99, checkin: 50, form: 49, assessment: 0, request: 0 },
    completed: { all: 150, checkin: 50, form: 50, assessment: 50, request: 0 } };
  state.data.reviews = { total: 150, cursor: null, more: true };
  state.data.more = true;
  const html = render();
  expect(html).toContain('201 مستنيين ردك');
  expect(html).toMatch(/>201<\/b>/);
  expect(html).toMatch(/>99<\/b>/);
  expect(html).toMatch(/>150<\/b>/);
  expect(html).not.toContain('خلصت كل المتابعات');
});
vi.mock('server-only', () => ({}));
