import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { startSession } from './data/log-set';
import { hydrateSession } from './data/hydrate-session';
import { sessionId } from './ids';
import { latestSession, newerSession } from './data/last-performance';
import { mergeHistory } from './data/pr-history';
import { finishSummary } from './data/finish-summary';

const now = Date.parse('2026-11-16T10:00:00Z');
const timestamp = new Date(now).toISOString();
const db = new KochivoDB('multi-device', 'player');
beforeEach(async () => { await db.open(); });
const remote = vi.hoisted(() => ({ row: null as object | null }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ from: () => ({
  select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: remote.row, error: null }) }) }) }),
}) }) }));
afterEach(async () => { await db.delete(); remote.row = null; vi.unstubAllGlobals(); });

it('hydrates a completed deterministic session without queuing a fresh start', async () => {
  remote.row = { id: await sessionId('day', '2026-11-16'), program_day_id: 'day', training_date: '2026-11-16',
    started_at: timestamp, completed_at: timestamp, client_updated_at: timestamp, session_rpe: 8, player_note: 'Done' };
  const row = await startSession(db, { id: 'day' }, '2026-11-16', now);
  expect(row).toMatchObject({ completed_at: timestamp, session_rpe: 8, player_note: 'Done' });
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
