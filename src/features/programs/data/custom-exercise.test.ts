import { beforeEach, expect, it, vi } from 'vitest';
import { createCustomExercise, updateCustomExercise, deleteCustomExercise } from './custom-exercise';

const mocks = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), row: vi.fn(),
  insert: vi.fn(), update: vi.fn(), remove: vi.fn(), eq: vi.fn(), from: vi.fn() }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: mocks.user }, from: mocks.from,
}) }));
const id = '01900000-0000-7000-8000-000000000001';
const owner = '01900000-0000-7000-8000-000000000002';
const input = { name: ' Press ', bodyPart: 'chest', target: 'Pecs', videoUrl: 'https://example.com' };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: owner } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: 'captain', suspended_at: null }, error: null });
  mocks.row.mockResolvedValue({ data: { id, name_ar: 'Press', owner_id: owner }, error: null });
  const query = { eq: mocks.eq, select: () => query, single: mocks.row };
  mocks.eq.mockReturnValue(query);
  mocks.insert.mockReturnValue(query); mocks.update.mockReturnValue(query); mocks.remove.mockReturnValue(query);
  mocks.from.mockImplementation((table: string) => table === 'profiles'
    ? { select: () => ({ eq: () => ({ single: mocks.profile }) }) }
    : { insert: mocks.insert, update: mocks.update, delete: mocks.remove });
});
it('rejects invalid inputs before accessing the database', async () => {
  for (const patch of [{ name: '' }, { bodyPart: 'other' }, { videoUrl: 'http://example.com' }]) {
    expect(await createCustomExercise({ ...input, ...patch }, id)).toEqual({ error: 'invalidCustomExercise' });
  }
  expect(await updateCustomExercise('bad', input)).toEqual({ error: 'invalidCustomExercise' });
  expect(await deleteCustomExercise('bad')).toEqual({ error: 'invalidCustomExercise' });
  expect(mocks.from).not.toHaveBeenCalled();
});
it('inserts a captain-owned row with matching translated names and the optimistic ID', async () => {
  expect(await createCustomExercise(input, id)).toMatchObject({ data: { id, is_own: true } });
  expect(mocks.insert).toHaveBeenCalledWith({ id, owner_id: owner, name_ar: 'Press', name_en: 'Press',
    body_part: 'chest', target: 'Pecs', video_url: 'https://example.com', equipment: null });
});
it.each(['player', 'suspended', 'missing'])('denies a %s caller', async role => {
  if (role === 'missing') mocks.user.mockResolvedValue({ data: { user: null }, error: null });
  else mocks.profile.mockResolvedValue({ data: { role: role === 'player' ? 'player' : 'captain',
    suspended_at: role === 'suspended' ? '2026-11-03' : null }, error: null });
  expect(await createCustomExercise(input, id)).toEqual({ error: 'customExerciseSaveFailed' });
  expect(mocks.insert).not.toHaveBeenCalled();
});
it('scopes edits and deletes to the authenticated owner and clears optional fields', async () => {
  await updateCustomExercise(id, { name: 'Press', bodyPart: 'back' });
  expect(mocks.update).toHaveBeenCalledWith({ name_ar: 'Press', name_en: 'Press', body_part: 'back', target: null, video_url: null, equipment: null });
  expect(mocks.eq.mock.calls).toEqual([['id', id], ['owner_id', owner]]);
  mocks.eq.mockClear();
  expect(await deleteCustomExercise(id)).toEqual({ data: true });
  expect(mocks.eq.mock.calls).toEqual([['id', id], ['owner_id', owner]]);
});
it.each(['treadmill', 'stairmaster'])('persists %s equipment on insert and edit and clears it outside cardio', async equipment => {
  await createCustomExercise({ ...input, bodyPart: 'cardio', equipment }, id);
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ equipment }));
  await updateCustomExercise(id, { ...input, bodyPart: 'cardio', equipment });
  expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ equipment }));
  await updateCustomExercise(id, { ...input, equipment });
  expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ equipment: null }));
});
it('archives a referenced exercise with an owner-scoped update', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
  try {
    mocks.row.mockResolvedValueOnce({ data: null, error: { code: '23503' } });
    expect(await deleteCustomExercise(id)).toEqual({ data: { archived: true } });
    expect(mocks.update).toHaveBeenCalledWith({ archived_at: '2026-11-04T10:00:00.000Z' });
    expect(mocks.eq.mock.calls).toEqual([['id', id], ['owner_id', owner], ['id', id], ['owner_id', owner]]);
  } finally { vi.useRealTimers(); }
});
it('reports an archive failure without claiming success', async () => {
  mocks.row.mockResolvedValueOnce({ data: null, error: { code: '23503' } })
    .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
  expect(await deleteCustomExercise(id)).toEqual({ error: 'customExerciseDeleteFailed' });
});
it('returns translated errors for missing rows and transport failures', async () => {
  mocks.row.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
  expect(await updateCustomExercise(id, input)).toEqual({ error: 'customExerciseSaveFailed' });
  expect(await deleteCustomExercise(id)).toEqual({ error: 'customExerciseDeleteFailed' });
  mocks.user.mockRejectedValue(new Error('private'));
  expect(await createCustomExercise(input, id)).toEqual({ error: 'customExerciseSaveFailed' });
});
