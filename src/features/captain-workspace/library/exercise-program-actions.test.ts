import { beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), add: vi.fn(), single: vi.fn(), order: vi.fn(),
  claims: vi.fn(), eq: vi.fn(), filter: vi.fn() }));
vi.mock('@/features/programs', () => ({ loadProgram: mock.load, saveProgram: mock.save, addExercise: mock.add }));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '019a0000-0000-7000-8000-000000000004' }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => {
  const query = { select: () => query, eq: mock.eq, in: mock.filter, is: () => query, single: mock.single, order: mock.order };
  mock.eq.mockReturnValue(query); mock.filter.mockReturnValue(query);
  return { auth: { getClaims: mock.claims }, from: () => query };
} }));
import { addExerciseToProgram, exerciseProgramDays, exercisePrograms } from './exercise-program-actions';

const program = '019a0000-0000-7000-8000-000000000001';
const day = '019a0000-0000-7000-8000-000000000002';
const exercise = '019a0000-0000-7000-8000-000000000003';
const draft = { id: program, status: 'draft', days: [{ id: day, title: 'Day one' }] };
beforeEach(() => {
  vi.clearAllMocks();
  mock.claims.mockResolvedValue({ data: { claims: { sub: 'captain' } } });
  mock.order.mockResolvedValue({ data: [{ id: program, title: 'Strength' }] });
  mock.load.mockResolvedValue({ data: draft });
  mock.single.mockResolvedValue({ data: { id: exercise } });
  mock.add.mockReturnValue('updated-draft'); mock.save.mockResolvedValue({ ok: true });
});

it('lists only the authenticated captain’s active and draft programs', async () => {
  expect(await exercisePrograms()).toEqual([{ id: program, title: 'Strength' }]);
  expect(mock.eq).toHaveBeenCalledWith('captain_id', 'captain');
  expect(mock.filter).toHaveBeenCalledWith('status', ['draft', 'active']);
});

it('returns days from the existing ownership-checked loader', async () => {
  expect(await exerciseProgramDays(program)).toEqual([{ id: day, title: 'Day one' }]);
  expect(mock.load).toHaveBeenCalledWith(program);
});

it('loads the current program and exercise, creates an id and saves through existing program actions', async () => {
  expect(await addExerciseToProgram(program, day, exercise)).toBe(true);
  expect(mock.add).toHaveBeenCalledWith(draft, day, { id: exercise }, '019a0000-0000-7000-8000-000000000004');
  expect(mock.save).toHaveBeenCalledWith('updated-draft');
});

it('rejects invalid ids without reading or writing', async () => {
  expect(await addExerciseToProgram('invalid', day, exercise)).toBe(false);
  expect(mock.load).not.toHaveBeenCalled(); expect(mock.save).not.toHaveBeenCalled();
});

it.each([{ error: 'denied' }, { data: { ...draft, days: [] } }, { data: { ...draft, status: 'archived' } }])('does not write an inaccessible or mismatched program (%s)', async result => {
  mock.load.mockResolvedValue(result);
  expect(await addExerciseToProgram(program, day, exercise)).toBe(false);
  expect(mock.save).not.toHaveBeenCalled();
});

it('reports a failed save rather than claiming success', async () => {
  mock.save.mockResolvedValue({ ok: false });
  expect(await addExerciseToProgram(program, day, exercise)).toBe(false);
});
