import { beforeEach, expect, it, vi } from 'vitest';
import { startTraining, trainingTemplates } from './training-start';

const state = vi.hoisted(() => ({ insert: vi.fn(), save: vi.fn(), load: vi.fn(), remove: vi.fn(), eq: vi.fn() }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('./program-io', () => ({ loadProgram: state.load, saveProgram: state.save }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
  from: () => {
    const query = {
      select: () => query, eq: (key: string, value: unknown) => { state.eq(key, value); return query; },
      single: async () => ({ data: { id: 'template' }, error: null }),
      order: async () => ({ data: [], error: null }),
      insert: state.insert, delete: () => { state.remove(); return query; },
      then: (resolve: (value: unknown) => void) => Promise.resolve({ error: null }).then(resolve),
    };
    return query;
  },
}) }));
beforeEach(() => {
  vi.clearAllMocks(); state.insert.mockResolvedValue({ error: null }); state.save.mockResolvedValue({ ok: true });
});
const player = '01900000-0000-7000-8000-000000000001';
const template = '01900000-0000-7000-8000-000000000002';
it('creates an empty draft directly for the player without inserting a fixed week', async () => {
  const result = await startTraining(player);
  expect(result.data).toMatchObject({ player_id: player, status: 'draft', days: [], repeatWeekly: false });
  expect(state.insert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ is_template: false, status: 'draft', player_id: player }));
  expect(state.save).not.toHaveBeenCalled();
});
it('copies template rows with fresh identities and retains the workbook reference', async () => {
  state.load.mockResolvedValue({ data: { id: template, title: 'Plan', notes: 'Four source weeks', days: [{ id: 'old-day', position: 1,
    exercises: [{ id: 'old-exercise', exercise_id: 'library' }], cardio: [{ id: 'old-cardio' }] }] } });
  const result = await startTraining(player, template);
  const day = result.data?.days[0];
  expect(day?.id).not.toBe('old-day');
  expect(day?.exercises[0]?.day_id).toBe(day?.id);
  expect(day?.exercises[0]?.id).not.toBe('old-exercise');
  expect(day?.cardio?.[0]?.day_id).toBe(day?.id);
  expect(result.data?.status).toBe('draft');
  expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ source_template_id: template, notes: 'Four source weeks' }));
  expect(state.save).toHaveBeenCalledWith(result.data);
  expect(state.eq).toHaveBeenCalledWith('is_template', true);
});
it('cleans up an unsuccessful template copy and returns the real save failure', async () => {
  state.load.mockResolvedValue({ data: { title: 'Plan', days: [{ id: 'day', exercises: [] }] } });
  state.save.mockResolvedValue({ ok: false, error: 'save failed' });
  expect(await startTraining(player, template)).toEqual({ error: 'save failed' });
  expect(state.remove).toHaveBeenCalledOnce();
});
it('restricts the template list to the current captain', async () => {
  expect(await trainingTemplates()).toEqual({ data: [] });
  expect(state.eq).toHaveBeenCalledWith('captain_id', 'captain');
  expect(state.eq).toHaveBeenCalledWith('is_template', true);
});
it('rejects invalid identifiers before accessing the database', async () => {
  expect((await startTraining('invalid')).error).toBeTruthy();
  expect(state.insert).not.toHaveBeenCalled();
});
