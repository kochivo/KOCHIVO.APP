import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { startSession } from './data/log-set';
import { hydrateSession } from './data/hydrate-session';
import { sessionId } from './ids';
import { latestSession, newerSession } from './data/last-performance';
import { mergeHistory } from './data/pr-history';
import { finishSummary } from './data/finish-summary';
import { saveAndQueue, type SetLogRow } from '@/core/offline';

const now = Date.parse('2026-11-16T10:00:00Z');
const timestamp = new Date(now).toISOString();
const db = new KochivoDB('multi-device', 'player');
beforeEach(async () => { await db.open(); });
const remote = vi.hoisted(() => ({ row: null as object | null, sets: [] as object[] }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ from: (table: string) => ({
  select: () => ({ eq: () => ({ eq: () => table === 'set_logs' ? Promise.resolve({ data: remote.sets, error: null }) :
    ({ maybeSingle: async () => ({ data: remote.row, error: null }) }) }) }),
}) }) }));
afterEach(async () => { await db.delete(); remote.row = null; remote.sets = []; vi.unstubAllGlobals(); });

it('hydrates a completed deterministic session without queuing a fresh start', async () => {
  remote.row = { id: await sessionId('day', '2026-11-16'), program_day_id: 'day', training_date: '2026-11-16',
    started_at: timestamp, completed_at: timestamp, client_updated_at: timestamp, session_rpe: 8, player_note: 'Done' };
  const row = await startSession(db, { id: 'day' }, '2026-11-16', now);
  expect(row).toMatchObject({ completed_at: timestamp, session_rpe: 8, player_note: 'Done' });
  expect(await db.outbox.count()).toBe(0);
});

it('hydrates main and drop sets with their chosen alternative on a second phone', async () => {
  remote.row = { id: 'session', program_day_id: 'day', training_date: '2026-11-16',
    started_at: timestamp, completed_at: timestamp, client_updated_at: timestamp };
  remote.sets = [0, 1].map(drop_index => ({ id: `set-${drop_index}`, session_id: 'session',
    program_exercise_id: 'prescription', exercise_id: 'alternative', set_index: 1, drop_index,
    weight_kg: 50, reps: 8, completed_at: timestamp, client_updated_at: timestamp, deleted_at: null }));
  await hydrateSession(db, 'session');
  expect(await db.set_logs.toArray()).toEqual(remote.sets);
  expect((await db.workout_sessions.get('session'))?.completed_at).toBe(timestamp);
  expect(await db.outbox.count()).toBe(0);
});

it('preserves newer local feedback while learning server completion', async () => {
  const id = await sessionId('day', '2026-11-16');
  await db.workout_sessions.put({ id, program_day_id: 'day', training_date: '2026-11-16', started_at: timestamp,
    completed_at: null, client_updated_at: '2026-11-16T12:00:00Z', session_rpe: 9, player_note: 'Local' });
  remote.row = { id, program_day_id: 'day', training_date: '2026-11-16', started_at: timestamp,
    completed_at: timestamp, client_updated_at: timestamp, session_rpe: 8, player_note: 'Server' };
  await hydrateSession(db, id);
  expect(await db.workout_sessions.get(id)).toMatchObject({ completed_at: timestamp, session_rpe: 9, player_note: 'Local' });
});

it('merges corrections and tombstones while protecting pending edits and local deletions', async () => {
  remote.row = { id: 'session', program_day_id: 'day', training_date: '2026-11-16',
    started_at: timestamp, completed_at: timestamp, client_updated_at: timestamp };
  const set = (id: string, set_index: number): SetLogRow => ({ id, session_id: 'session',
    program_exercise_id: 'prescription', exercise_id: 'alternative', set_index, drop_index: 0,
    weight_kg: 50, reps: 8, completed_at: timestamp, client_updated_at: timestamp, deleted_at: null });
  await db.set_logs.bulkPut([set('correction', 1), set('deletion', 2),
    { ...set('local-deletion', 3), deleted_at: timestamp }, set('equal', 5),
    { ...set('newer-local', 6), client_updated_at: '2026-11-16T14:00:00Z' }]);
  await saveAndQueue(db, 'set_logs', set('pending', 4), now);
  remote.sets = ['correction', 'deletion', 'local-deletion', 'pending', 'equal', 'newer-local'].map((id, index) => ({
    ...set(id, index + 1), reps: 10, client_updated_at: id === 'equal' ? timestamp : '2026-11-16T13:00:00Z',
    deleted_at: id === 'deletion' ? timestamp : null,
  }));
  await hydrateSession(db, 'session');
  expect((await db.set_logs.get('correction'))?.reps).toBe(10);
  expect((await db.set_logs.get('deletion'))?.deleted_at).toBe(timestamp);
  expect((await db.set_logs.get('local-deletion'))?.deleted_at).toBe(timestamp);
  for (const id of ['pending', 'equal', 'newer-local']) expect((await db.set_logs.get(id))?.reps).toBe(8);
  expect(await db.outbox.count()).toBe(1);
});

it('starts and queues locally without contacting the server offline', async () => {
  vi.stubGlobal('navigator', { onLine: false });
  expect(await startSession(db, { id: 'day' }, '2026-11-16', now)).toMatchObject({ completed_at: null });
  expect(await db.outbox.count()).toBe(1);
});

it('chooses the newer eligible history even when this phone has older sets', () => {
  const row = { id: 'old', session_id: 'old', set_index: 1, weight_kg: 50, reps: 8, completed_at: '2026-11-14' };
  const local = latestSession([row]);
  const remote = latestSession([{ ...row, id: 'new', session_id: 'new', completed_at: '2026-11-15', weight_kg: 60 }]);
  expect(newerSession(local, remote)?.sets[0]?.weight_kg).toBe(60);
  expect(newerSession(remote, local)?.sets[0]?.weight_kg).toBe(60);
});

it('merges newer server corrections and deletions into PR and finish baselines', () => {
  const row = { id: 'old', session_id: 'old', exercise_id: 'bench', program_exercise_id: 'p', set_index: 1,
    weight_kg: 50, reps: 8, completed_at: '2026-11-14', client_updated_at: '2026-11-14', deleted_at: null };
  const current = { ...row, id: 'today', session_id: 'today', weight_kg: 60, completed_at: '2026-11-16' };
  const merged = mergeHistory([row, current], [{ ...row, weight_kg: 70, client_updated_at: '2026-11-15' }]);
  expect(finishSummary(merged, 'today').records).toBe(0);
  expect(mergeHistory([row], [{ ...row, deleted_at: timestamp, client_updated_at: timestamp }])).toEqual([]);
});
