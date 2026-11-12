import { beforeEach, expect, it, vi } from 'vitest';
import type { Tables } from '@/types/database';
import { changeTierStatus } from './tier-operations';

const state = vi.hoisted(() => ({ rows: [] as Tables<'captain_package_tiers'>[], fail: '' }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('./client', () => ({ captainClient: async () => ({ captainId: 'owner', client: {
  from: () => {
    const filters: Record<string, unknown> = {};
    let patch: Record<string, unknown> | undefined;
    const matches = () => state.rows.filter(row => Object.entries(filters).every(([key, value]) => row[key as keyof typeof row] === value));
    const chain = {
      select: () => chain, eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
      is: (key: string, value: unknown) => { filters[key] = value; return chain; },
      update: (value: Record<string, unknown>) => { patch = value; return chain; },
      single: async () => {
        const row = matches()[0];
        if (!row || patch && (row.id === state.fail || patch.is_featured === true && state.rows.some(other => other.id !== row.id && other.is_featured))) return { data: null, error: { code: '23505' } };
        if (patch) Object.assign(row, patch);
        return { data: { ...row }, error: null };
      },
      then: (done: (value: unknown) => unknown) => Promise.resolve({ data: matches().map(row => ({ ...row })), error: null }).then(done),
    };
    return chain;
  },
} }) }));
const oldId = '01900000-0000-7000-8000-000000000207', newId = '01900000-0000-7000-8000-000000000208';
beforeEach(() => {
  state.fail = '';
  state.rows = [oldId, newId].map((id, position) => ({ id, captain_id: 'owner', name: id, description: '', color: 'lime', features: [], position,
    is_featured: position === 0, archived_at: null, created_at: '2026-11-12T00:00:00Z' }));
});
it('switches featured tiers without violating the unique featured constraint', async () => {
  expect(await changeTierStatus(newId, 'feature')).toEqual({ data: true });
  expect(state.rows.map(row => row.is_featured)).toEqual([false, true]);
});
it('clears an archived featured tier before selecting a new one', async () => {
  const old = state.rows[0];
  if (!old) throw new Error('Missing old tier');
  old.archived_at = '2026-11-11T00:00:00Z';
  expect(await changeTierStatus(newId, 'feature')).toEqual({ data: true });
  expect(state.rows.map(row => row.is_featured)).toEqual([false, true]);
});
it('restores the previous featured tier if selecting the new tier fails', async () => {
  state.fail = newId;
  expect(await changeTierStatus(newId, 'feature')).toEqual({ error: 'packageFailed' });
  expect(state.rows.map(row => row.is_featured)).toEqual([true, false]);
});
it('releases the featured slot when archiving a tier', async () => {
  expect(await changeTierStatus(oldId, 'archive', new Date('2026-11-12T12:00:00Z'))).toEqual({ data: true });
  expect(state.rows[0]?.is_featured).toBe(false);
  expect(state.rows[0]?.archived_at).toBe('2026-11-12T12:00:00.000Z');
});
