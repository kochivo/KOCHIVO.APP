import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { KochivoDB } from '@/core/offline';
import type { HistorySession, HistorySet } from './history-grouping';

export interface HistoryName { id: string; name_ar: string | null; name_en: string }
export interface HistoryData {
  sessions: HistorySession[]; sets: HistorySet[]; names: HistoryName[]; days: { id: string; title: string }[];
}
export const emptyHistory: HistoryData = { sessions: [], sets: [], names: [], days: [] };

export async function localHistory(db: KochivoDB, playerId: string): Promise<HistoryData> {
  const snapshot = await db.program_snapshot.get('active');
  // Local log rows have no player_id; only read them for the owner of this device's snapshot.
  if (snapshot?.player_id !== playerId) return emptyHistory;
  const [sessions, sets] = await Promise.all([db.workout_sessions.toArray(), db.set_logs.toArray()]);
  return { sessions, sets, days: snapshot.days.map(({ id, title }) => ({ id, title })),
    names: snapshot.days.flatMap(day => day.exercises.map(exercise => ({ ...exercise, id: exercise.exercise_id }))) };
}

// Explicit ranges avoid silently losing older sets at the Data API row limit.
async function readSets(client: SupabaseClient<AppDatabase>, playerId: string): Promise<HistorySet[]> {
  const rows: HistorySet[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('set_logs')
      .select('id,session_id,program_exercise_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at,deleted_at')
      .eq('player_id', playerId).order('id').range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

export async function remoteHistory(client: SupabaseClient<AppDatabase>, playerId: string, limit: number, allSessions: boolean): Promise<HistoryData> {
  const sessions: HistorySession[] = [];
  for (let offset = 0; ; offset += 500) {
    const end = allSessions ? offset + 499 : Math.min(offset + 499, limit - 1);
    const { data, error } = await client.from('workout_sessions')
      .select('id,program_day_id,training_date,started_at,completed_at,client_updated_at')
      .eq('player_id', playerId).not('completed_at', 'is', null)
      .order('training_date', { ascending: false }).order('started_at', { ascending: false }).order('id', { ascending: false }).range(offset, end);
    if (error) throw error;
    sessions.push(...data);
    if (data.length < 500 || (!allSessions && sessions.length >= limit)) break;
  }
  const sets = await readSets(client, playerId);
  const names: HistoryName[] = [];
  const days: HistoryData['days'] = [];
  const exerciseIds = [...new Set(sets.map(row => row.exercise_id))];
  const dayIds = [...new Set(sessions.flatMap(row => row.program_day_id ? [row.program_day_id] : []))];
  for (let offset = 0; offset < exerciseIds.length; offset += 100) {
    const { data, error } = await client.from('exercises').select('id,name_ar,name_en').in('id', exerciseIds.slice(offset, offset + 100));
    if (error) throw error;
    names.push(...data);
  }
  for (let offset = 0; offset < dayIds.length; offset += 100) {
    const { data, error } = await client.from('program_days').select('id,title').in('id', dayIds.slice(offset, offset + 100));
    if (error) throw error;
    days.push(...data);
  }
  return { sessions, sets, names, days };
}
