import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { KochivoDB } from './db';
import { uuidv7 } from './ids';
import { saveAndQueue } from './outbox';
import type { WorkoutSessionRow } from './tables';

vi.mock('./media-queue', () => ({ mediaPending: async () => 0, flushMediaQueue: async () => undefined, supabaseMediaTransport: () => undefined }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({}) }));

const { startSync } = await import('./runner');

let db: KochivoDB;
let stop: (() => void) | undefined;

beforeEach(() => {
  const win = Object.assign(new EventTarget(), { setInterval: () => 1, clearInterval: () => undefined });
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
  vi.stubGlobal('navigator', { onLine: true });
  db = new KochivoDB(`runner-${uuidv7()}`);
});
afterEach(async () => {
  stop?.();
  vi.unstubAllGlobals();
  await db.delete();
});

const session = (): WorkoutSessionRow => ({
  id: uuidv7(), program_day_id: uuidv7(), training_date: '2026-11-10', started_at: '2026-11-10T08:00:00Z',
  completed_at: null, client_updated_at: '2026-11-10T08:00:00Z',
});

const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(resolve => setTimeout(resolve, 0)); };

it('sends a save at once instead of waiting for the next interval tick', async () => {
  const sent: string[] = [];
  stop = startSync(db, async (_table, rows) => { sent.push(...rows.map(row => row.id)); });
  await settle();
  const row = session();
  await saveAndQueue(db, 'workout_sessions', row);
  await vi.waitFor(async () => expect(await db.outbox.count()).toBe(0));
  expect(sent).toEqual([row.id]);
});

it('gives a save that lands during a flush its own pass right after', async () => {
  const first = session();
  const second = session();
  await saveAndQueue(db, 'workout_sessions', first);
  let release: () => void = () => undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const sent: string[] = [];
  stop = startSync(db, async (_table, rows) => {
    if (rows.some(row => row.id === first.id)) await gate;
    sent.push(...rows.map(row => row.id));
  });
  await settle();
  await saveAndQueue(db, 'workout_sessions', second);
  release();
  await vi.waitFor(async () => expect(await db.outbox.count()).toBe(0));
  expect(sent).toContain(second.id);
});
