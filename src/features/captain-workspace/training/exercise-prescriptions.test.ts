import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { DraftExercise, LibraryExercise } from '@/features/programs';
import { AlternativesSheet } from './alternatives-sheet';
import { SetPlanEditor } from './set-plan-editor';
import { InlineSearch } from './inline-search';
import { Stepper } from '@/ui/stepper';
import { messages } from './editor/messages';

vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/client', () => ({ useT: (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'ar') }));
const library: LibraryExercise = { id: 'bench', name_en: 'Bench', name_ar: null, media_path: null, body_part: 'chest', equipment: null };
const row: DraftExercise = { id: 'row', day_id: 'day', exercise_id: library.id, position: 1, library,
  sets: 2, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null, notes: null, rir: null,
  alternatives: ['press'], alternative_library: [{ ...library, id: 'press', name_en: 'Press' }], set_plan: null };
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
it('reuses inline search, excludes selected and original IDs and preserves chips until an explicit removal', () => {
  const onPatch = vi.fn();
  const result = nodes(AlternativesSheet({ row, onPatch, onClose() {} }));
  const search = result.find(node => node.type === InlineSearch);
  expect(search?.props.excluded).toEqual(['bench', 'press']);
  (search?.props.onAdd as (row: LibraryExercise) => void)({ ...library, id: 'fly' });
  expect(onPatch).toHaveBeenLastCalledWith({ alternatives: ['press', 'fly'],
    alternative_library: [row.alternative_library?.[0], { ...library, id: 'fly' }] });
  (result.find(node => node.props['aria-label'] === 'شيل Press')?.props.onClick as () => void)();
  expect(onPatch).toHaveBeenLastCalledWith({ alternatives: [], alternative_library: [] });
  expect(row.alternatives).toEqual(['press']);
});
it('blocks a fourth choice and ignores duplicates and the original exercise', () => {
  const onPatch = vi.fn();
  for (const prescription of [row, { ...row, alternatives: ['press', 'fly', 'cable'] }]) {
    const search = nodes(AlternativesSheet({ row: prescription, onPatch, onClose() {} })).find(node => node.type === InlineSearch);
    const add = search?.props.onAdd as (row: LibraryExercise) => void;
    add(library); add({ ...library, id: 'press' });
    if (prescription.alternatives?.length === 3) { expect(search?.props.disabled).toBe(true); add({ ...library, id: 'fourth' }); }
  }
  expect(onPatch).not.toHaveBeenCalled();
});
it('edits a single set and restores uniform mode using the same autosave patch path', () => {
  const plan = [{ reps_min: 12, reps_max: 12, rir: 2 }, { reps_min: 8, reps_max: 10, rir: null }];
  const onChange = vi.fn(), result = nodes(SetPlanEditor({ plan, onChange }));
  const controls = result.filter(node => node.type === Stepper);
  expect(controls).toHaveLength(2);
  (controls[1]?.props.onChange as (reps: number) => void)(11);
  expect(onChange).toHaveBeenLastCalledWith([plan[0], { reps_min: 11, reps_max: 11, rir: null }]);
  const intensity = result.find(node => node.type === 'select');
  (intensity?.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: '0' } });
  expect(onChange).toHaveBeenLastCalledWith([{ ...plan[0], rir: 0 }, plan[1]]);
  (result.find(node => node.props.children === 'زي بعض')?.props.onClick as () => void)();
  expect(onChange).toHaveBeenLastCalledWith(null);
});
it('provides all new labels in Egyptian, standard Arabic and English', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  for (const [locale, style, label] of [['ar', 'egyptian', 'زي بعض'], ['ar', 'standard', 'نفس التكرارات'], ['en', 'egyptian', 'Same for all']] as const) {
    expect(createT(messages, locale, style)('uniform')).toBe(label);
  }
  vi.unstubAllEnvs();
});
