import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { TasksState } from './tasks-state';
import { TaskRow } from './task-row';
import { buildTasks } from './tasks-model';
const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, element));
it('links the missing nutrition row and action to the player nutrition editor', () => {
  const [task] = buildTasks([], [{ playerId: 'p', fullName: 'Player', accessUntil: '2026-12-01',
    startedOn: '2026-11-14', lastTrainingDate: '2026-11-14', programTitle: 'Plan', openTasks: 0 }],
  [], new Date('2026-11-14T12:00:00Z'), 'Africa/Cairo', [], new Set());
  if (!task) throw new Error('missing nutrition task');
  const html = render(createElement(TaskRow, { task, selected: false, first: false, pending: false,
    onSelect: () => {}, onAction: () => {} }));
  expect(html.match(/href="\/ar\/captain\/players\/p\/nutrition"/g)).toHaveLength(2);
  expect(html).toContain('محتاج نظام أكل');
  expect(html).toContain('ادّيله نظام أكل');
  expect(html).toContain('dir-icon');
  expect(html).toContain('press');
});
it('renders the completed ring and full empty message only when all tasks are done', () => {
  const html = render(createElement(TasksState, { kind: 'empty' }));
  expect(html).toContain('خلصت كل المهام');
  expect(html).toContain('عاش يا كابتن. أي حاجة جديدة هتظهر هنا.');
  expect(html).toContain('<circle');
  expect(html).not.toContain('جرّب تاني');
});
it('renders loading and recoverable errors without claiming completion', () => {
  expect(render(createElement(TasksState, { kind: 'loading' }))).toContain('role="status"');
  const html = render(createElement(TasksState, { kind: 'error', retry: () => {} }));
  expect(html).toContain('role="alert"');
  expect(html).toContain('جرّب تاني');
  expect(html).not.toContain('خلصت كل المهام');
});
it('keeps the row selection separate from its task-specific action', () => {
  const html = render(createElement(TaskRow, { task: { id: 'swap:s', playerId: 'p', name: 'أحمد', kind: 'swap',
    at: '2026-11-14', swap: { id: 's', player_id: 'p', created_at: '2026-11-14', from: 'Squat', to: 'Press' } },
  selected: true, first: false, pending: false, onSelect: () => {}, onAction: () => {} }));
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('وافق');
  expect(html).toContain('عايز يبدل Squat بـ Press');
  expect(html.match(/<button/g)).toHaveLength(2);
});
it('links an assessment row and action to the existing review screen', () => {
  const html = render(createElement(TaskRow, { task: { id: 'request:r', playerId: 'p', name: 'Player',
    kind: 'checkin', at: '2026-11-14', text: 'Assessment',
    href: '/captain/players/p/assessments?requestId=r#assessment-details' },
  selected: false, first: false, pending: false, onSelect: () => {}, onAction: () => {} }));
  expect(html.match(/href="\/ar\/captain\/players\/p\/assessments\?requestId=r#assessment-details"/g)).toHaveLength(2);
  expect(html).toContain('dir-icon');
  expect(html).toContain('press');
});
