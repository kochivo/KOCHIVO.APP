import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
const state = vi.hoisted(() => ({ calls: [] as unknown[][], rows: [] as unknown[], uses: 0, alternatives: 0, owner: 'owner', remove: vi.fn() }));
vi.mock('./data/custom-food', () => ({ deleteCustomFood: state.remove }));
vi.mock('./data/client', () => ({
  toFood: (row: { id: string }) => ({ ...row, name: 'Food' }),
  planClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
    from: (table: string) => {
      let selection = '';
      const q = {
        select: (value: string) => { selection = value; state.calls.push(['select', table, value]); return q; },
        single: async () => ({ data: { owner_id: state.owner }, error: null }),
        then: (resolve: (value: unknown) => void) => resolve({ data: table === 'meal_items' ? []
          : selection.includes('meal_items') ? state.rows.map(row => ({ ...(row as object), meal_items: [{ count: state.uses }], meal_item_alternatives: [{ count: state.alternatives }] })) : state.rows,
          count: table === 'meal_items' ? state.uses : table === 'meal_item_alternatives' ? state.alternatives : state.rows.length, error: null }),
        is: (...args: unknown[]) => { state.calls.push(['is', ...args]); return q; },
        eq: (...args: unknown[]) => { state.calls.push(['eq', ...args]); return q; },
        gt: (...args: unknown[]) => { state.calls.push(['gt', ...args]); return q; },
        or: (...args: unknown[]) => { state.calls.push(['or', ...args]); return q; },
        in: (...args: unknown[]) => { state.calls.push(['in', ...args]); return q; },
        order: (...args: unknown[]) => { state.calls.push(['order', ...args]); return q; },
        limit: (...args: unknown[]) => { state.calls.push(['limit', ...args]); return q; },
      }; return q;
    },
  }),
}));
import { listLibraryFoods, deleteLibraryFood, checkFoodDuplicate } from './data/food-library';
const id = '01900000-0000-7000-8000-000000000001';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.calls = []; state.rows = []; state.uses = 0; state.alternatives = 0; state.owner = 'owner'; state.remove.mockReset();
});
it('requests only 40 rows ordered by an exclusive id cursor, with escaped bilingual search', async () => {
  await listLibraryFoods({ query: 'a%_"', segment: 'mine', cursor: id });
  expect(state.calls).toContainEqual(['limit', 40]);
  expect(state.calls).toContainEqual(['gt', 'id', id]);
  expect(state.calls).toContainEqual(['order', 'id']);
  expect(state.calls).toContainEqual(['eq', 'owner_id', 'owner']);
  const searches = state.calls.filter(call => call[0] === 'or');
  expect(searches[0]?.[1]).toBe('name_ar.ilike."%a\\\\%\\\\_\\"%",name_en.ilike."%a\\\\%\\\\_\\"%"');
});
it('gets usage counts for the entire page in one grouped request', async () => {
  state.rows = [{ id }]; state.uses = 7;
  const result = await listLibraryFoods({ query: '', segment: 'all' });
  expect(result).toMatchObject({ ok: true, data: { foods: [{ uses: 7 }] } });
  expect(state.calls.filter(call => call[0] === 'select' && String(call[2]).includes('meal_items'))).toHaveLength(1);
});
it('returns the final row id as the next cursor for a full page', async () => {
  state.rows = Array.from({ length: 40 }, (_, index) => ({ id: String(index) }));
  expect(await listLibraryFoods({ query: '', segment: 'global' })).toMatchObject({ ok: true, data: { cursor: '39' } });
  expect(state.calls).toContainEqual(['is', 'owner_id', null]);
});
it('does not make a grouped usage request for an empty page', async () => {
  expect(await listLibraryFoods({ query: '', segment: 'all' })).toMatchObject({ ok: true, data: { foods: [], cursor: null } });
  expect(state.calls.some(call => call[0] === 'in')).toBe(false);
});
it('rejects a malformed cursor and disabled flag before querying', async () => {
  expect(await listLibraryFoods({ query: '', segment: 'all', cursor: 'invalid' })).toMatchObject({ ok: false });
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(await listLibraryFoods({ query: '', segment: 'all' })).toMatchObject({ ok: false });
  expect(state.calls).toEqual([]);
});
it('checks normalized duplicates against catalog names independently of the current list', async () => {
  state.rows = [{ id, name_ar: 'جُبنة', name_en: 'Cheese' }];
  expect(await checkFoodDuplicate('جبنه', '')).toEqual({ ok: true, data: true });
  expect(await checkFoodDuplicate('جبنه', '', id)).toEqual({ ok: true, data: false });
  expect(state.calls).toContainEqual(['limit', 200]);
});
it('rejects global deletes before reaching the existing writer', async () => {
  state.owner = '';
  expect(await deleteLibraryFood(id)).toMatchObject({ ok: false });
  expect(state.remove).not.toHaveBeenCalled();
});
it('blocks a used food and includes its usage count', async () => {
  state.uses = 17;
  const result = await deleteLibraryFood(id);
  expect(result).toMatchObject({ ok: false, error: expect.stringContaining('17') });
  expect(state.remove).not.toHaveBeenCalled();
});
it('blocks deletion when the food is used only as an alternative', async () => {
  state.alternatives = 3;
  expect(await deleteLibraryFood(id)).toMatchObject({ ok: false, error: expect.stringContaining('3') });
  expect(state.remove).not.toHaveBeenCalled();
});
it('deletes unused own food through the existing writer with archiving disabled', async () => {
  state.remove.mockResolvedValue({ ok: true, data: undefined });
  expect(await deleteLibraryFood(id)).toEqual({ ok: true, data: undefined });
  expect(state.remove).toHaveBeenCalledWith(id, true);
});
