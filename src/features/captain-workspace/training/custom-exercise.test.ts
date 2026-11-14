import { beforeEach, expect, it, vi } from 'vitest';
import type { LibraryExercise, ProgramDraft } from '@/features/programs';
import { applyCustomExercise } from './day-exercises';
import { completeCustomExerciseReturn, customExerciseHref, prepareCustomExerciseNavigation } from './custom-exercise';

vi.mock('./data/editor-actions', () => ({ loadLibraryExercise: vi.fn() }));
vi.mock('server-only', () => ({}));
import { loadLibraryExercise } from './data/editor-actions';
const row = { id: 'exercise', name_ar: 'سكوات', name_en: 'Squat', body_part: 'upper legs', equipment: 'dumbbell', media_path: null,
  is_own: true, owner_id: 'captain', target: null, video_url: null, secondary_muscles: [], instructions_ar: [], archived_at: null } satisfies LibraryExercise;
const initial = (): ProgramDraft => ({ id: 'program', player_id: 'player', title: 'Plan', status: 'draft', days: [
  { id: 'first', program_id: 'program', title: 'First', position: 1, exercises: [], warmup: { items: [], ramp: false } },
  { id: 'selected', program_id: 'program', title: 'Selected', position: 2, exercises: [], warmup: { items: [], ramp: false } },
] });
beforeEach(() => vi.clearAllMocks());
it('carries the editor program, selected day and existing query in the link', () => {
  const href = customExerciseHref('/ar/captain/templates/p?plan=p', 'program', 'selected');
  const url = new URL(href, 'https://test.invalid');
  expect(url.pathname).toBe('/captain/library/exercises/new');
  expect(url.searchParams.get('returnTo')).toBe('/ar/captain/templates/p?plan=p&exerciseProgram=program&exerciseDay=selected');
  expect(new URL(customExerciseHref('/captain/programs/p', 'program', 'selected', 'exercise'), 'https://test.invalid').pathname)
    .toBe('/captain/library/exercises/exercise/edit');
});
it('waits for a successful flush before navigating, and stays if flushing fails', async () => {
  const events: string[] = [];
  expect(await prepareCustomExerciseNavigation(async () => { events.push('flush'); return false; }, () => events.push('navigate'))).toBe(false);
  expect(events).toEqual(['flush']);
  expect(await prepareCustomExerciseNavigation(async () => { events.push('saved'); return true; }, () => events.push('navigate'))).toBe(true);
  expect(events).toEqual(['flush', 'saved', 'navigate']);
});
it('adds once to the selected day and preserves the other day', () => {
  const draft = initial();
  const next = applyCustomExercise(draft, 'program', 'selected', row, 'add', 'row-id');
  expect(next.days[0]).toEqual(draft.days[0]);
  expect(next.days[1]?.exercises).toMatchObject([{ id: 'row-id', exercise_id: 'exercise', day_id: 'selected' }]);
  expect(applyCustomExercise(next, 'program', 'selected', row, 'add', 'other-id')).toBe(next);
});
it('ignores returns for another program, a missing/rest day, or a non-owned exercise', () => {
  const draft = initial();
  expect(applyCustomExercise(draft, 'other', 'selected', row, 'add', 'id')).toBe(draft);
  expect(applyCustomExercise(draft, 'program', 'missing', row, 'add', 'id')).toBe(draft);
  expect(applyCustomExercise(draft, 'program', 'selected', { ...row, is_own: false }, 'add', 'id')).toBe(draft);
  const rest = { ...draft, days: draft.days.map(day => ({ ...day, is_rest_day: true })) };
  expect(applyCustomExercise(rest, 'program', 'selected', row, 'add', 'id')).toBe(rest);
});
it('refreshes an edited exercise without adding another set of prescriptions', () => {
  const draft = applyCustomExercise(initial(), 'program', 'selected', row, 'add', 'row-id');
  const selected = draft.days[1]?.exercises[0];
  if (!selected) throw new Error('Missing exercise');
  draft.days[0] = { ...draft.days[0], id: 'first', program_id: 'program', title: 'First', position: 1, warmup: { items: [], ramp: false },
    exercises: [{ ...selected, id: 'other', day_id: 'first', exercise_id: 'other', library: null, alternative_library: [row] }] };
  const next = applyCustomExercise(draft, 'program', 'selected', { ...row, name_ar: 'سكوات جديد' }, 'edit', 'unused');
  expect(next.days[1]?.exercises).toHaveLength(1);
  expect(next.days[1]?.exercises[0]).toMatchObject({ id: 'row-id', library: { name_ar: 'سكوات جديد' } });
  expect(next.days[0]?.exercises[0]?.alternative_library?.[0]?.name_ar).toBe('سكوات جديد');
});
it('loads the returned row, updates the draft and persists it before reporting success', async () => {
  vi.mocked(loadLibraryExercise).mockResolvedValue({ data: row });
  let draft = initial();
  const saved: ProgramDraft[] = [];
  expect(await completeCustomExerciseReturn('exercise', value => {
    draft = applyCustomExercise(draft, 'program', 'selected', value, 'add', 'row-id');
  }, async () => { saved.push(draft); return true; })).toBe(true);
  expect(saved[0]?.days[1]?.exercises[0]?.exercise_id).toBe('exercise');
});
it('leaves the return pending on a save failure, and never applies a failed/foreign read', async () => {
  vi.mocked(loadLibraryExercise).mockResolvedValue({ data: row });
  expect(await completeCustomExerciseReturn('exercise', () => {}, async () => false)).toBe(false);
  for (const result of [{ error: 'failed' }, { data: { ...row, is_own: false } }]) {
    vi.mocked(loadLibraryExercise).mockResolvedValue(result);
    let applied = false;
    await expect(completeCustomExerciseReturn('exercise', () => { applied = true; }, async () => true)).rejects.toThrow();
    expect(applied).toBe(false);
  }
});
