import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { AssessmentWorkspace } from './components/assessment-workspace';
import { AssessmentFields } from './components/assessment-fields';
import type { AssessmentWorkspaceData } from './data/assessment-workspace';
import type { AssessmentInput } from './assessment-schema';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('server-only', () => ({}));
vi.mock('./data/assessment-actions', () => ({ assessmentWorkspace: vi.fn(), saveAssessmentSchedule: vi.fn(),
  pauseAssessmentSchedule: vi.fn(), deleteAssessmentSchedule: vi.fn() }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data, status: 'ready', retry() {}, mutate: vi.fn() }) }));

const formId = '00000000-0000-7000-8000-000000000001';
const playerId = '00000000-0000-7000-8000-000000000002';
const schedule: AssessmentInput = { id: '00000000-0000-7000-8000-000000000003', form_id: formId,
  player_id: playerId, kind: 'days', every_days: 3, weekday: null, day: null, hour: 10, minute: 30,
  starts_on: '2026-11-12', ends_on: null, max_times: 4, remind_after_hours: 24, paused_at: null };
const data: AssessmentWorkspaceData = { forms: [{ id: formId, title: 'Weekly', schedule: null }],
  players: [{ id: playerId, name: 'Ali', timezone: 'Africa/Cairo', joined: '2026-11-12' }],
  schedules: [
    { ...schedule, captain_id: 'captain', created_at: '', updated_at: '' },
    { ...schedule, id: 'paused', paused_at: '2026-11-12T10:00:00Z', captain_id: 'captain', created_at: '', updated_at: '' },
  ], answers: [], counts: [] };

it('keeps the existing manager’s player picker, every recurrence, reminders and lifecycle controls available', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));
  try {
    const html = renderToStaticMarkup(createElement(AssessmentWorkspace, { formId, locale: 'en' }));
    for (const label of ['Who receives it?', 'All players', 'Ali', 'Once', 'Every week', 'Every month',
      'Every few days', 'When they join', 'Starts on', 'Time', 'Until I stop it', 'Until', 'Number of sends',
      'No reminder', 'Remind after 12 hours', 'Remind after a day', 'Edit', 'Pause', 'Resume', 'Delete', 'Cancel']) {
      expect(html).toContain(label);
    }
  } finally { vi.useRealTimers(); }
});

it('retains stored per-player frequency, minute precision, date limits and send limits in the existing editor fields', () => {
  const render = (value: AssessmentInput) => renderToStaticMarkup(createElement(AssessmentFields, {
    value, locale: 'en', onChange() {},
  }));
  const count = render(schedule);
  for (const value of ['3', '10:30', '2026-11-12', '4']) expect(count).toContain(`value="${value}"`);
  expect(render({ ...schedule, max_times: null, ends_on: '2026-12-12' })).toContain('value="2026-12-12"');
});
