import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { AssessmentPanel } from './components/assessment-panel';
import { AssessmentFields } from './components/assessment-fields';
import { AssessmentLibraryList } from './components/assessment-library-list';
import type { AssessmentWorkspaceData } from './data/assessment-workspace';
import type { AssessmentLibraryData } from './data/assessment-library';
import type { AssessmentSchedule } from '@/types/assessment-schedules';
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }) }));
const schedule: AssessmentSchedule = { id: 's', form_id: 'f', captain_id: 'c', player_id: 'p', kind: 'once',
  every_days: null, weekday: null, day: null, hour: 10, minute: 0, starts_on: '2026-11-14', ends_on: null,
  max_times: 1, remind_after_hours: null, paused_at: null, created_at: '2026-11-12T10:00Z', updated_at: '2026-11-12T10:00Z' };
const data: AssessmentWorkspaceData = { forms: [{ id: 'f', title: 'Knee', schedule: null }],
  players: [{ id: 'p', name: 'Ali', timezone: 'Europe/London', joined: '2026-11-03' }],
  schedules: [schedule], answers: [], counts: [{ schedule_id: 's', player_id: 'p', sends: 1 }] };
const noop = () => undefined;
it('shows exhausted targeted schedules as finished from the library, with recipient and controls', () => {
  const html = renderToStaticMarkup(createElement(AssessmentPanel, { data, locale: 'en', now: new Date('2026-11-14T09:00Z'),
    busy: false, onEdit: noop, onPause: noop, onDelete: noop, onSend: noop }));
  expect(html).toContain('Schedule finished');
  expect(html).toContain('Ali');
  for (const label of ['Edit', 'Pause', 'Delete']) expect(html).toContain(label);
  expect(html).not.toContain('Next ');
});
it('keeps the four player recurrence choices and their matching end and reminder inputs', () => {
  const html = renderToStaticMarkup(createElement(AssessmentFields, { value: { ...schedule, kind: 'days', every_days: 3,
    ends_on: '2026-12-14', max_times: null }, onChange: noop, locale: 'ar', allowOnJoin: false }));
  for (const label of ['مرة واحدة', 'كل أسبوع', 'كل شهر', 'كل كام يوم', 'فكّره بعد 12 ساعة', 'فكّره بعد يوم']) expect(html).toContain(label);
  expect(html).toContain('value="3"');
  expect(html).toContain('value="2026-12-14"');
  expect(html).not.toContain('أول ما ينضم');
});
it('keeps existing all-player schedules and the four approved template links visible', () => {
  const library: AssessmentLibraryData = { ...data, forms: [{ id: 'f', captain_id: 'c', title: 'Weekly', kind: 'checkin',
    schedule: { every: 'week', weekday: 5, hour: 10 }, remind_after_hours: 24, questions: [] }],
    metrics: { active: 1, sent: 4, answered: 3, recipients: 2, averageHours: 5 }, byForm: {}, pending: 1, answeredWeek: 3,
    activity: { f: { waiting: 1, lastAnswer: null, sent: true } }, now: '2026-11-12T10:00Z', waitingReview: 1, timezone: 'Africa/Cairo' };
  const html = renderToStaticMarkup(createElement(AssessmentLibraryList, { data: library, locale: 'ar' }));
  expect(html).toContain('لكل اللاعبين (1)');
  for (const key of ['checkin', 'progress', 'onboarding', 'photos']) expect(html).toContain(`?template=${key}`);
  expect(html).toContain('?edit=f');
});
