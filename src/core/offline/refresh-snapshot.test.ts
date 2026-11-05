import { afterEach, describe, expect, it, vi } from 'vitest';
import { KochivoDB, type ProgramSnapshot } from './db';
import { refreshCachedSnapshot } from './refresh-snapshot';

const snapshot: ProgramSnapshot = { id: 'active', player_id: 'player', program_id: 'program',
  title: 'برنامج', notes: null, settings: {}, training_days: [], days: [] };

afterEach(() => vi.unstubAllGlobals());

describe('refreshCachedSnapshot', () => {
  it('defaults to browser connectivity and allows an explicit override', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const db = new KochivoDB('shared-refresh-connectivity');
    try {
      const options = { db: () => db, table: (value: KochivoDB) => value.program_snapshot,
        fetch: async () => snapshot };
      expect(await refreshCachedSnapshot(options)).toBe('offline');
      expect(await refreshCachedSnapshot({ ...options, online: true })).toBe('ready');
      expect(await db.program_snapshot.get('active')).toEqual(snapshot);
    } finally { await db.delete(); }
  });
  it('does not fetch or open the database offline', async () => {
    const fetch = vi.fn(async () => snapshot);
    const db = vi.fn(() => { throw new Error('must not open'); });
    expect(await refreshCachedSnapshot({ online: false, fetch, db, table: value => value })).toBe('offline');
    expect(fetch).not.toHaveBeenCalled();
    expect(db).not.toHaveBeenCalled();
  });
  it('replaces the selected snapshot and deletes an empty snapshot', async () => {
    const db = new KochivoDB('shared-refresh');
    try {
      const options = { online: true, db: () => db, table: (value: KochivoDB) => value.program_snapshot };
      expect(await refreshCachedSnapshot({ ...options, fetch: async () => snapshot })).toBe('ready');
      expect(await db.program_snapshot.get('active')).toEqual(snapshot);
      expect(await db.nutrition_snapshot.count()).toBe(0);
      expect(await refreshCachedSnapshot({ ...options, fetch: async () => null })).toBe('empty');
      expect(await db.program_snapshot.get('active')).toBeUndefined();
    } finally { await db.delete(); }
  });
  it('preserves the cache and does not open the database if fetching fails', async () => {
    const db = vi.fn(() => { throw new Error('must not open'); });
    expect(await refreshCachedSnapshot({ online: true, db, table: value => value,
      fetch: async () => { throw new Error('network'); } })).toBe('error');
    expect(db).not.toHaveBeenCalled();
  });
  it.each(['open', 'put', 'delete'])('returns error on database %s failure', async failure => {
    const table = { put: async () => { throw new Error('disk'); }, delete: async () => { throw new Error('disk'); } };
    expect(await refreshCachedSnapshot({ online: true,
      db: () => { if (failure === 'open') throw new Error('open'); return table; },
      table: value => value, fetch: async () => failure === 'delete' ? null : snapshot })).toBe('error');
  });
});
