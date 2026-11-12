import { createElement } from 'react';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { SetRows } from './components/set-rows';
vi.mock('server-only', () => ({}));

const state: ComponentProps<typeof SetRows>['state'] = {
  current: { exercise: { id: 'p', exercise_id: 'e', name_ar: 'بنش', name_en: 'Bench press', position: 1,
    sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null,
    rpe: null, tempo: null, notes: null, media_path: null }, setIndex: 2, restAfter: 90 },
  doneSets: [{ id: 's', session_id: 'session', program_exercise_id: 'p', exercise_id: 'e', set_index: 1,
    weight_kg: 50, reps: 10, completed_at: '2026-11-12T10:00:00Z', deleted_at: null, client_updated_at: '2026-11-12T10:00:00Z' }],
  disabled: false, invalid: null, rest: { remaining: 0 }, weight: 52.5, reps: 9, bodyweight: false,
  setWeight() {}, setReps() {}, setBodyweight() {}, edit() {}, complete: async () => {},
};
const render = (patch: Partial<typeof state> = {}) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
  createElement(SetRows, { state: { ...state, ...patch } })));

it('offers editing completed sets and big numeric controls only for the current set', () => {
  const html = render();
  expect(html.match(/<input/g)).toHaveLength(2);
  expect(html).toContain('value="52.5"');
  expect(html).toContain('value="9"');
  expect(html.match(/aria-current="step"/g)).toHaveLength(1);
  expect(html).toMatch(/aria-label="Edit set 1"[^>]*aria-pressed="true"/);
  expect(html).toMatch(/aria-label="Complete set"[^>]*min-h-14/);
});

it('blocks completing the next set during rest and explains invalid reps', () => {
  expect(render({ rest: { remaining: 54 } })).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Complete set"/);
  const html = render({ invalid: { key: 'current', result: 'reps', attempt: 1 } });
  expect(html).toContain('role="alert"');
  expect(html).toContain('Enter the number of reps');
});

it('shows each set target and its RIR while old cached snapshots keep uniform rows', () => {
  if (!state.current) throw new Error('Missing fixture');
  const html = render({ current: { ...state.current, exercise: { ...state.current.exercise,
    set_plan: [{ reps_min: 12, reps_max: 12, rir: 2 }, { reps_min: 10, reps_max: 10, rir: 1 },
      { reps_min: 8, reps_max: null, rir: null }] } } });
  expect(html).toContain('Target: 12'); expect(html).toContain('Target: 10');
  expect(html).toContain('Leave 2 reps'); expect(html).toContain('Target: To failure');
  expect(render()).not.toContain('Target:');
});
