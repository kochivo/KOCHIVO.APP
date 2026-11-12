import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { DraftExercise } from '@/features/programs';
import { TrainingExerciseRow } from './exercise-row';

const state = vi.hoisted(() => ({ open: false }));
vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => [state.open, (operation: (open: boolean) => boolean) => { state.open = operation(state.open); }],
}));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar') }));
const row: DraftExercise = { id: 'e', day_id: 'd', exercise_id: 'x', position: 1, sets: 4, reps_min: 6, reps_max: 8,
  alternatives: [], set_plan: null,
  rest_seconds: 120, rir: 2, notes: 'Slow descent', superset_group: null,
  library: { id: 'x', name_ar: 'بنش', name_en: 'Bench', body_part: 'chest', equipment: 'barbell', media_path: null },
};
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
beforeEach(() => { state.open = false; });
it('opens notes and extra actions in place, saves a changed note, then closes again', () => {
  const onPatch = vi.fn(), props = { row, onPatch, onRemove: vi.fn(), onMove: vi.fn(), onLink: vi.fn(), first: true, last: false, dragProps: {} };
  const render = () => nodes(TrainingExerciseRow(props));
  const toggle = () => { const button = render().find(node => node.props['aria-controls'] === 'exercise-e'); (button?.props.onClick as () => void)(); };
  expect(render().find(node => node.type === 'textarea')).toBeUndefined();
  toggle();
  expect(render().find(node => node.props['aria-expanded'] === true)).toBeDefined();
  const note = render().find(node => node.type === 'textarea');
  expect(note?.props.value).toBe('Slow descent');
  (note?.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: 'Pause at the bottom' } });
  expect(onPatch).toHaveBeenCalledWith({ notes: 'Pause at the bottom' });
  const link = render().find(node => node.props.children === 'اربطه سوبرسِت');
  (link?.props.onClick as () => void)(); expect(props.onLink).toHaveBeenCalledOnce();
  toggle(); expect(render().find(node => node.type === 'textarea')).toBeUndefined();
});

it('adds the two mockup actions only behind the workspace flag and uses the existing patch callback', () => {
  state.open = true;
  const onPatch = vi.fn(), props = { row, onPatch, onRemove() {}, onMove() {}, onLink() {}, first: true, last: false, dragProps: {} };
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(nodes(TrainingExerciseRow(props)).find(node => node.props.children === 'مجموعات مختلفة')).toBeUndefined();
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const result = nodes(TrainingExerciseRow(props));
  const different = result.find(node => node.props.children === 'مجموعات مختلفة');
  (different?.props.onClick as () => void)();
  expect(onPatch).toHaveBeenCalledWith({ set_plan: Array.from({ length: 4 }, () => ({ reps_min: 6, reps_max: 8, rir: 2 })) });
  expect(result.find(node => node.props.id === 'alternatives-e')).toBeDefined();
  vi.unstubAllEnvs();
});
