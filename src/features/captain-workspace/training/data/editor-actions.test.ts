import { beforeEach, expect, it, vi } from 'vitest';
import { removeCustom, saveCustom } from './editor-actions';
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getT: async () => () => 'Try again' }));
vi.mock('@/features/roster', () => ({ fetchRoster: vi.fn() }));
const state = vi.hoisted(() => ({ role: 'captain', suspended: false, foreignKey: false,
  insert: vi.fn(), update: vi.fn(), remove: vi.fn(), eq: vi.fn() }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain-id' } }, error: null }) },
  from: (table: string) => {
    let operation = '';
    const request = {
      select: () => request,
      eq: (key: string, value: string) => { state.eq(table, key, value); return request; },
      insert: (value: object) => { operation = 'insert'; state.insert(value); return request; },
      update: (value: object) => { operation = 'update'; state.update(value); return request; },
      delete: () => { operation = 'delete'; state.remove(); return request; },
      single: async () => table === 'profiles' ? { data: { role: state.role, suspended_at: state.suspended ? 'suspended' : null }, error: null } :
        operation === 'delete' && state.foreignKey ? { error: { code: '23503' }, data: null } :
          { error: null, data: { id: '01900000-0000-7000-8000-000000000001', name_ar: 'بنش', name_en: 'بنش', body_part: 'chest', equipment: null, media_path: null } },
    };
    return request;
  },
}) }));
const id = '01900000-0000-7000-8000-000000000001';
const input = { name: '  بنش  ', bodyPart: 'chest', equipment: '', target: 'Chest', video: '' };
beforeEach(() => { vi.clearAllMocks(); state.role = 'captain'; state.suspended = false; state.foreignKey = false; });
it('creates a private exercise using the authenticated owner and normalized fields', async () => {
  expect(await saveCustom(input)).toMatchObject({ data: { is_own: true } });
  expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: 'captain-id', name_ar: 'بنش', name_en: 'بنش', target: 'Chest' }));
});
it('updates an existing custom exercise with both id and owner filters', async () => {
  expect(await saveCustom(input, id)).toHaveProperty('data');
  expect(state.insert).not.toHaveBeenCalled();
  expect(state.eq).toHaveBeenCalledWith('exercises', 'id', id);
  expect(state.eq).toHaveBeenCalledWith('exercises', 'owner_id', 'captain-id');
});
it('archives a referenced custom exercise instead of breaking program references', async () => {
  state.foreignKey = true;
  expect(await removeCustom(id)).toEqual({ data: true });
  expect(state.update).toHaveBeenCalledWith({ archived_at: expect.any(String) });
  expect(state.eq).toHaveBeenCalledWith('exercises', 'owner_id', 'captain-id');
});
it.each(['player', 'suspended'])('rejects custom writes for %s', async mode => {
  state.role = mode === 'player' ? 'player' : 'captain'; state.suspended = mode === 'suspended';
  expect(await saveCustom(input, id)).toHaveProperty('error');
  expect(await removeCustom(id)).toHaveProperty('error');
  expect(state.update).not.toHaveBeenCalled(); expect(state.remove).not.toHaveBeenCalled();
});
it('rejects invalid ids and unsafe video URLs before touching the database', async () => {
  expect(await saveCustom({ ...input, video: 'http://example.com/video' })).toHaveProperty('error');
  expect(await saveCustom(input, 'bad-id')).toHaveProperty('error');
  expect(await removeCustom('bad-id')).toHaveProperty('error');
  expect(state.insert).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
});
