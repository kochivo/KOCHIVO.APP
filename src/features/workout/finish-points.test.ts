import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { FinishPoints } from './components/finish-points';
import type { WorkoutPoints } from './data/load-workout-points';

const initial: WorkoutPoints = { points: { lifetime: 254, tier: 'champion', monthly: 55, month_position: 2,
  crown_gap: 9, adherence: 50, done: 4, planned: 8, crown_needs_workouts: 0, logs: [] }, rows: [
  { id:'w',kind:'workout',points:3,status:'counted' }, { id:'pr',kind:'pr',points:1,status:'pending' },
] };
const render = (data?: WorkoutPoints, expectedPrs = 0) => renderToStaticMarkup(createElement(LocaleProvider,{locale:'en'},
  createElement(FinishPoints,{sessionId:'session',expected:true,expectedPrs,initial:data})));

it('shows server-counted points and keeps pending PRs out of the total', () => {
  const html = render(initial);
  expect(html).toMatch(/<p[^>]*>\+3<\/p>/);
  expect(html).toContain('Personal record');
  expect(html).toContain('Points pending');
  expect(html).toContain('data-medal-rank="2"');
  expect(html).toContain('Position 2 in the crown race');
  expect(html).not.toMatch(/<p[^>]*>\+4<\/p>/);
});
it('shows an expected workout as pending until server data arrives', () => {
  const html = render();
  expect(html).toContain('Waiting to sync');
  expect(html).not.toMatch(/<p[^>]*>\+3<\/p>/);
});
it('shows each locally detected PR as pending before sync without awarding it', () => {
  const html = render(undefined, 2);
  expect(html.match(/Personal record/g)).toHaveLength(2);
  expect(html).not.toMatch(/<p[^>]*>\+5<\/p>/);
});
it('keeps missing PR rows pending during partial sync', () => {
  const html = render({ ...initial, rows: initial.rows.filter(row => row.kind === 'workout') }, 2);
  expect(html.match(/Personal record/g)).toHaveLength(2);
  expect(html).toMatch(/<p[^>]*>\+3<\/p>/);
});
it('keeps a server rejection terminal instead of showing expected points as pending', () => {
  const html = render({ ...initial, rows: [{ id:'w',kind:'workout',points:3,status:'rejected' }] });
  expect(html).toContain('Not counted');
  expect(html).not.toContain('Waiting to sync');
});
