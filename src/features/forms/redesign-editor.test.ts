import { createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { QuestionEditor } from './components/question-editor';
import { QuestionRules } from './components/question-rules';
import { ThemedSelect } from './components/themed-select';
import { questionSummary } from './question-summary';
import { copyTemplate } from './model';
import { templateCopyForAction } from './template-copy';
import { templates } from './templates';
import { matchesAlert } from './answers';
import type { Question } from './types';
import { ScheduleEditor } from './components/schedule-editor';
import type { AssessmentSchedule } from '@/types/assessment-schedules';

function elements<T>(node: ReactNode, type: unknown): ReactElement<T>[] {
  if (Array.isArray(node)) return node.flatMap(child => elements<T>(child, type));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [...(node.type === type ? [node as ReactElement<T>] : []), ...elements<T>(node.props.children, type)];
}

it('repeated visits to a single copy action reuse every ID, while another click creates a distinct copy', async () => {
  const first = await templateCopyForAction('checkin', 'captain', 'action-one', 'ar');
  expect(await templateCopyForAction('checkin', 'captain', 'action-one', 'ar')).toEqual(first);
  const second = await templateCopyForAction('checkin', 'captain', 'action-two', 'ar');
  expect(second.id).not.toBe(first.id);
  expect(second.questions[0]?.id).not.toBe(first.questions[0]?.id);
});

it('starts collapsed and summarizes units, profile mapping and the stored alert', () => {
  const form = copyTemplate(templates[0], 'captain'), q = form.questions[0];
  if (!q) throw new Error('Missing question');
  const html = renderToStaticMarkup(createElement(QuestionEditor, { question: q, locale: 'ar', index: 0,
    count: 1, onChange() {}, onMove() {}, onDelete() {} }));
  expect(html).not.toMatch(/<details[^>]*\bopen(?:=|>)/);
  expect(html).toContain('كجم');
  expect(html).toContain('بيتسجل في ملف اللاعب: الوزن');
  expect(questionSummary({ ...q, type: 'scale', maps_to: null, alert_on: { operator: 'lt', value: 6 } }, 'ar'))
    .toContain('مقياس 1–10 · بينبّهك لو أقل من 6');
});

it('edits an alert sentence without resetting the threshold and matches its stored rule', () => {
  const initial = copyTemplate(templates[0], 'captain').questions[2];
  if (!initial) throw new Error('Missing question');
  let q: Question = { ...initial, alert_on: { operator: 'lt', value: 6 } };
  const rule = () => QuestionRules({ question: q, locale: 'ar', onChange: next => { q = next; } });
  const selects = elements<Parameters<typeof ThemedSelect>[0]>(rule(), ThemedSelect);
  selects.find(s => s.props.value === 'lt')?.props.onChange('gt');
  expect(q.alert_on).toEqual({ operator: 'gt', value: 6 });
  expect(matchesAlert(q.alert_on, 7)).toBe(true);
  expect(matchesAlert(q.alert_on, 5)).toBe(false);
  expect(questionSummary(q, 'ar')).toContain('بينبّهك لو أكبر من 6');
});

it('shows the actual audience for a per-player schedule instead of claiming all players', () => {
  const form = { ...copyTemplate(templates[0], 'captain'), schedule: null };
  const schedule: AssessmentSchedule = { id: 'schedule', form_id: form.id, captain_id: 'captain', player_id: 'player',
    kind: 'week', weekday: 5, day: null, every_days: null, hour: 10, minute: 0, starts_on: '2026-11-12',
    ends_on: null, max_times: null, paused_at: null, remind_after_hours: 24, created_at: '', updated_at: '' };
  const html = renderToStaticMarkup(createElement(ScheduleEditor, { form, locale: 'en', onChange() {},
    scheduleContext: { schedules: [schedule], players: [{ id: 'player', name: 'Ali' }] } }));
  expect(html).toContain('For Ali');
  expect(html).toContain('Schedules and players');
  expect(html).not.toContain('All players');
});

it('keeps a stored alert when the already-selected answer type is tapped', () => {
  const initial = copyTemplate(templates[0], 'captain').questions[2];
  if (!initial) throw new Error('Missing question');
  let q = initial;
  const tree = QuestionEditor({ question: q, locale: 'ar', index: 0, count: 1,
    onChange: next => { q = next; }, onMove() {}, onDelete() {} });
  elements<{ 'aria-pressed'?: boolean; onClick: () => void }>(tree, 'button')
    .find(button => button.props['aria-pressed'])?.props.onClick();
  expect(q.alert_on).toEqual({ operator: 'lt', value: 6 });
});
