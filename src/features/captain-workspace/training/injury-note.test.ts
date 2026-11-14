import { createElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { ProgramDraft } from '@/features/programs';
import { emptyWarmup } from '@/features/programs';
import { InjuryNote } from './injury-note';
import { replaceInjuryExercise } from './fit-checks';

vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'ar', useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar') }));
const library = { id: 'a', name_en: 'Bench', name_ar: 'بنش', body_part: 'chest', equipment: 'barbell', media_path: null };
const candidates = [
  { exercise_id: 'a', pattern: 'h_push', stress: ['shoulder'], library },
  { exercise_id: 'b', pattern: 'h_push', stress: [], library: { ...library, id: 'b', name_ar: 'بديل آمن' } },
  { exercise_id: 'c', pattern: 'h_push', stress: [], library: { ...library, id: 'c', name_ar: 'بديل تاني' } },
];
const row = { id: 'e', day_id: 'day', exercise_id: 'a', library, position: 1, sets: 4,
  reps_min: 6, reps_max: 8, rest_seconds: 120, rir: 2, superset_group: null, notes: 'Slow',
  set_plan: [{ reps_min: 6, reps_max: 8, rir: 2 }], alternatives: ['b', 'c'],
};
const draft: ProgramDraft = { id: 'p', player_id: 'player', title: 'Plan', status: 'draft', days: [{
  id: 'day', program_id: 'p', title: 'Day', position: 1, warmup: emptyWarmup(), exercises: [row],
}] };
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
it('warns from stress tags and shows only one safe suggestion', () => {
  const html = renderToStaticMarkup(createElement(InjuryNote, { exerciseId: 'a', injuries: ['shoulder'], candidates, onReplace() {} }));
  expect(html).toContain('ممكن يضايق');
  expect(html).toContain('بديل آمن');
  expect(html).not.toContain('بديل تاني');
  expect(html).toContain('بدّله');
});
it.each(['untagged', 'b'])('shows nothing for exercise %s without an overlapping tag', exerciseId => {
  expect(renderToStaticMarkup(createElement(InjuryNote, { exerciseId, injuries: ['shoulder'], candidates, onReplace() {} }))).toBe('');
});
it('keeps the warning without a button when no safe option exists', () => {
  const html = renderToStaticMarkup(createElement(InjuryNote, { exerciseId: 'a', injuries: ['shoulder'], candidates: candidates.slice(0, 1), onReplace() {} }));
  expect(html).toContain('ممكن يضايق');
  expect(html).not.toContain('<button');
});
it('applies a one-tap swap through the editor operation, preserving prescriptions and row identity', () => {
  let current = draft;
  const tree = InjuryNote({ exerciseId: 'a', injuries: ['shoulder'], candidates,
    onReplace: replacement => { current = replaceInjuryExercise(current, 'day', 'e', replacement); },
  });
  const button = nodes(tree).find(node => node.type === 'button');
  if (!button) throw new Error('Missing swap action');
  (button.props.onClick as () => void)();
  expect(current.days[0]?.exercises[0]).toEqual({ ...row, exercise_id: 'b', library: candidates[1]?.library,
    alternatives: ['c'], alternative_library: undefined,
  });
  expect(draft.days[0]?.exercises[0]?.exercise_id).toBe('a');
  expect(renderToStaticMarkup(createElement(InjuryNote, { exerciseId: 'b', injuries: ['shoulder'], candidates, onReplace() {} }))).toBe('');
});
