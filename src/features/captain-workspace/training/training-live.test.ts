import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { ProgramDraft } from '@/features/programs';
import type * as Programs from '@/features/programs';
import { TrainingEditor } from './training-editor';
import { TrainingFacts } from './training-facts';
import type { TrainingPlayerFacts } from './training-facts';
import { DayRail } from './day-rail';
import { DayExercises } from './day-exercises';
import { TrainingExerciseRow } from './exercise-row';
import { InjuryNote } from './injury-note';
import { DaySummary } from './day-summary';

const state = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], draft: null as ProgramDraft | null }));
vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => {
      state.values[index] = typeof value === 'function' ? value(state.values[index]) : value;
    }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useArabicStyle: () => 'egyptian',
  useT: (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'en'),
}));
vi.mock('@/features/programs', async original => ({ ...await original<typeof Programs>(),
  useTrainingAutosave: () => ({ draft: state.draft, status: 'saved', error: '',
    update: (operation: (draft: ProgramDraft) => ProgramDraft) => { if (state.draft) state.draft = operation(state.draft); },
  }),
  useDragReorder: () => ({ listRef: null, handleProps: () => ({}), rowStyle: () => ({}) }),
}));
const library = { id: 'bench', name_ar: 'بنش', name_en: 'Bench', body_part: 'chest', equipment: 'barbell', media_path: null };
const day = { id: 'one', program_id: 'p', title: 'One', position: 1,
  warmup: { ramp: false, items: [{ id: 'warm', name: 'Walk', amount: 5, unit: 'min' as const }] },
  exercises: [{ id: 'row', day_id: 'one', exercise_id: 'bench', library, position: 1, sets: 3,
    reps_min: 8, reps_max: 12, rest_seconds: 90, rir: 2, superset_group: null, notes: null }],
};
const draft: ProgramDraft = { id: 'p', player_id: 'player', title: 'Plan', status: 'draft', days: [day,
  { ...day, id: 'two', title: 'Two', exercises: day.exercises.map(row => ({ ...row, day_id: 'two', sets: 10, rest_seconds: 180 })) },
] };
const playerFacts: TrainingPlayerFacts = { today: '2026-11-14', file: { facts: {}, history: [] }, fatPct: null,
  profile: { name: 'Ali', intake: {
    birthYear: 1996, sex: 'male', heightCm: 180, weightKg: 85, targetWeightKg: 80, trainingDays: [0, 2],
    sessionMinutes: 15, experience: 'new', injuries: ['shoulder'], allergies: [], medical: [], notes: null, completedAt: null,
  } },
  candidates: [{ exercise_id: 'bench', pattern: 'h_push', stress: ['shoulder'], library },
    { exercise_id: 'safe', pattern: 'h_push', stress: [], library: { ...library, id: 'safe', name_en: 'Safe press' } }],
};
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
function editor() {
  state.cursor = 0;
  return nodes(TrainingEditor({ playerId: 'player', initial: draft, programs: [], playerFacts }));
}
function getProps<T>(tree: ReactElement<Record<string, unknown>>[], component: (props: T) => unknown): T {
  const node = tree.find(item => item.type === component);
  if (!node) throw new Error('Missing component');
  return node.props as T;
}
beforeEach(() => { state.cursor = 0; state.values = []; state.draft = draft; });
it('passes the live selected day and updated draft into the panel', () => {
  let tree = editor();
  expect(getProps(tree, TrainingFacts).day?.id).toBe('one');
  expect(getProps(tree, DaySummary).day.id).toBe('one');
  expect(tree.findIndex(node => node.type === TrainingFacts)).toBeLessThan(tree.findIndex(node => node.type === DayExercises));
  getProps(tree, DayRail).onSelect('two');
  tree = editor();
  expect(getProps(tree, TrainingFacts).day?.id).toBe('two');
  const content = DayExercises(getProps(tree, DayExercises));
  const props = getProps(nodes(content), TrainingExerciseRow);
  props.onPatch({ sets: 4 });
  tree = editor();
  expect(getProps(tree, TrainingFacts).day?.exercises[0]?.sets).toBe(4);
  expect(getProps(tree, TrainingFacts).draft).toBe(state.draft);
});
it('wires the injury action through row, day and autosave while preserving prescriptions', () => {
  const tree = editor();
  const dayTree = nodes(DayExercises(getProps(tree, DayExercises)));
  const rowTree = nodes(TrainingExerciseRow(getProps(dayTree, TrainingExerciseRow)));
  const warning = InjuryNote(getProps(rowTree, InjuryNote));
  const action = nodes(warning).find(node => node.type === 'button');
  if (!action) throw new Error('Missing swap button');
  (action.props.onClick as () => void)();
  expect(state.draft?.days[0]?.exercises[0]).toMatchObject({ id: 'row', exercise_id: 'safe', sets: 3, rest_seconds: 90, rir: 2 });
  expect(state.draft?.days[1]).toBe(draft.days[1]);
  const updated = editor();
  const newRows = nodes(DayExercises(getProps(updated, DayExercises)));
  const newRow = nodes(TrainingExerciseRow(getProps(newRows, TrainingExerciseRow)));
  expect(InjuryNote(getProps(newRow, InjuryNote))).toBeNull();
});
it('expands the mobile panel with an accessible toggle', () => {
  const props = getProps(editor(), TrainingFacts);
  state.cursor = 0; state.values = [];
  let tree = nodes(TrainingFacts(props));
  const action = tree.find(node => node.type === 'button');
  expect(action?.props['aria-expanded']).toBe(false);
  (action?.props.onClick as () => void)();
  state.cursor = 0;
  tree = nodes(TrainingFacts(props));
  expect(tree.find(node => node.type === 'button')?.props['aria-expanded']).toBe(true);
  expect(tree.find(node => node.props.id === 'player-facts-p')?.props.className).toContain('block');
});
it('does not pass player facts or injury data into template screens', () => {
  state.draft = { ...draft, player_id: null };
  const tree = nodes(TrainingEditor({ mode: 'template', initial: state.draft, programs: [], playerFacts }));
  expect(tree.some(node => node.type === TrainingFacts)).toBe(false);
  expect(getProps(tree, DayExercises).injuries).toBeUndefined();
  expect(getProps(tree, DayExercises).candidates).toBeUndefined();
});
