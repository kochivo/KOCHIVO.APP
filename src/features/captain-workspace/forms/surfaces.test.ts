import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { FormsTimeline } from './forms-timeline';
import { FormAnswers } from './form-answers';
import { FormsState } from './forms-state';
import { WorkspaceHeader } from '../components/workspace-header';
import type { PlayerForm } from './adapter';

const form: PlayerForm = {
  snapshot: { source: { kind: 'intake', id: 'player', at: '2026-11-11T12:00:00Z' }, facts: { injuries: ['knee'] } },
  comparison: [{ key: 'injuries', value: ['knee'], previousValue: ['none'], direction: 'worse' }],
  reviewedAt: null, reply: null, photoCount: 0, bodyFat: null,
};
it.each(['ar', 'en'] as const)('renders selection, comparison and disabled reminder in %s', locale => {
  const html = renderToStaticMarkup(createElement(FormsTimeline, { forms: [form], selectedId: 'player', locale, onSelect: () => {} }));
  expect(html).toContain('aria-current="true"');
  expect(html).toContain('disabled=""');
  expect(html).toContain(locale === 'ar' ? 'كل أسبوع' : 'Every week');
  expect(html).toContain(locale === 'ar' ? 'الإصابات' : 'Injuries');
});
it('highlights injuries and links back to training', () => {
  const html = renderToStaticMarkup(createElement(FormAnswers, { form, locale: 'en', trainingHref: '/captain/players/player/programs' }));
  expect(html).toContain('text-danger');
  expect(html).toContain('Previously: None');
  expect(html).toContain('href="/captain/players/player/programs"');
});
it('shows a neutral numeric delta for body fat', () => {
  const html = renderToStaticMarkup(createElement(FormAnswers, { form: { ...form, bodyFat: 20, previousBodyFat: 21 }, locale: 'en', trainingHref: '/training' }));
  expect(html).toContain('Previously: 21%');
  expect(html).toContain('<bdi dir="ltr">-1</bdi>');
});
it.each(['loading', 'error', 'empty'] as const)('renders the %s state in both languages', kind => {
  for (const locale of ['ar', 'en'] as const) {
    const html = renderToStaticMarkup(createElement(FormsState, { kind, locale, retry: () => {} }));
    expect(html).toContain(kind === 'error' ? 'role="alert"' : 'role="status"');
  }
});
it('marks forms active and hides the unrelated send-plan action', () => {
  const html = renderToStaticMarkup(createElement(WorkspaceHeader, { playerId: 'player', name: 'Ahmed', locale: 'en', view: 'forms' }));
  expect(html).toMatch(/<a aria-current="page"[^>]+href="\/captain\/players\/player\/programs\?view=forms"/);
  expect(html).not.toContain('Send to player');
});
