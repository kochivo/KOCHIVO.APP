import { afterEach, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { KochivoDB } from '@/core/offline';
import { localHistory, remoteHistory } from './data/history';
import { groupHistory, mergeHistoryRows } from './data/history-grouping';

const now = '2026-11-04T10:00:00Z';
const session = { id: 'session', program_day_id: 'day', training_date: '2026-11-04', started_at: now, completed_at: now, client_updated_at: now };
const set = { id: 'set', session_id: 'session', program_exercise_id: 'item', exercise_id: 'exercise', set_index: 1,
  weight_kg: 60, reps: 8, completed_at: now, client_updated_at: now, deleted_at: null };
const db = new KochivoDB('history-data');
afterEach(async () => { await db.delete(); });

it('shows local unsynced workouts with snapshot names, without exposing another cached player', async () => {
  await db.program_snapshot.put({ id: 'active', player_id: 'player', program_id: 'program', title: 'Program', notes: null,
    settings: {}, training_days: [], days: [{ id: 'day', title: 'Legs', position: 1, exercises: [{
      id: 'item', exercise_id: 'exercise', name_ar: 'سكوات', name_en: 'Squat', position: 1, sets: 3, reps_min: 8,
      reps_max: 12, rest_seconds: 0, superset_group: null, rpe: null, tempo: null, notes: null, media_path: null,
    }] }] });
  await db.workout_sessions.put(session);
  await db.set_logs.put(set);
  const local = await localHistory(db, 'player');
  expect(local.names[0]).toMatchObject({ id: 'exercise', name_ar: 'سكوات' });
  expect(local.days).toEqual([{ id: 'day', title: 'Legs' }]);
  expect(groupHistory(local.sessions, mergeHistoryRows([set], local.sets))[0]?.setCount).toBe(1);
  expect((await localHistory(db, 'stranger')).sessions).toEqual([]);
});

it('scopes remote history to the signed-in player and requests a stable page of twenty finished workouts', async () => {
  const urls: URL[] = [];
  const client = createClient<AppDatabase>('https://history.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async input => {
      const url = new URL(String(input));
      urls.push(url);
      const data = url.pathname.endsWith('/workout_sessions') ? [session] : url.pathname.endsWith('/set_logs') ? [set] :
        url.pathname.endsWith('/exercises') ? [{ id: 'exercise', name_ar: null, name_en: 'Squat' }] : [{ id: 'day', title: 'Legs' }];
      return Response.json(data);
    } },
  });
  const data = await remoteHistory(client, 'player', 20, false);
  expect(groupHistory(data.sessions, data.sets)[0]?.exercises[0]?.sets[0]?.weight_kg).toBe(60);
  const sessions = urls.find(url => url.pathname.endsWith('/workout_sessions'));
  expect(sessions?.searchParams.get('player_id')).toBe('eq.player');
  expect(sessions?.searchParams.get('completed_at')).toBe('not.is.null');
  expect(sessions?.searchParams.get('limit')).toBe('20');
  expect(sessions?.searchParams.get('order')).toBe('training_date.desc,started_at.desc,id.desc');
  expect(urls.find(url => url.pathname.endsWith('/set_logs'))?.searchParams.get('player_id')).toBe('eq.player');
});
