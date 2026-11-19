'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import type { KochivoDB } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

interface History { accountStart: string; dates: string[] }
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
export async function readLocalStreakDates(db: KochivoDB, today: string): Promise<string[]> {
  const rows = await db.workout_sessions.where('training_date')
    .belowOrEqual(today).toArray();
  return rows.filter(row => row.completed_at !== null).map(row => row.training_date);
}
function cachedHistory(key: string): History | undefined {
  const raw: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
  if (raw && typeof raw === 'object' && 'accountStart' in raw && typeof raw.accountStart === 'string' &&
    'dates' in raw && Array.isArray(raw.dates) && raw.dates.every((date: unknown) => typeof date === 'string')) {
    return { accountStart: raw.accountStart, dates: raw.dates };
  }
}

async function readHistory(playerId: string, today: string): Promise<History> {
  const key = `kochivo-streak-${playerId}`;
  let cached: History | undefined;
  try { cached = cachedHistory(key); } catch { /* A blocked cache must not prevent an online read. */ }
  if (!navigator.onLine && cached) return cached;
  try {
    const client = await loadSupabaseBrowser();
    const link = await client.from('coach_clients').select('started_on').eq('player_id', playerId).is('archived_at', null)
      .order('started_on', { ascending: true }).limit(1).maybeSingle();
    if (link.error) throw link.error;
    if (!link.data) throw new Error('Missing player link');
    const accountStart = link.data.started_on;
    const dates = new Set<string>();
    const pageSize = 500;
    let cursor: string | undefined;
    for (;;) {
      const query = client.from('workout_sessions').select('id,training_date').eq('player_id', playerId)
        .not('completed_at', 'is', null).gte('training_date', accountStart).lte('training_date', today)
        .order('id').limit(pageSize);
      const page = await (cursor ? query.gt('id', cursor) : query);
      if (page.error) throw page.error;
      for (const row of page.data) dates.add(row.training_date);
      const last = page.data.at(-1);
      if (!last || page.data.length < pageSize) break;
      cursor = last.id;
    }
    const history = { accountStart, dates: [...dates] };
    try { localStorage.setItem(key, JSON.stringify(history)); } catch { /* Local workouts still work without this optional cache. */ }
    return history;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

export function useStreakSessions(today: string, playerId?: string) {
  const history = useRef<{ key: string; value: History | null } | undefined>(undefined);
  const warned = useRef(false);
  const [revision, setRevision] = useState(0);
  const warn = useCallback((error: unknown) => {
    if (!warned.current) { console.warn('Unable to load training streak', error); warned.current = true; }
  }, []);
  useEffect(() => {
    if (!playerId || !today) return;
    let active = true;
    const refresh = async () => {
      try {
        const value = await readHistory(playerId, today);
        if (active) { history.current = { key: `${playerId}:${today}`, value }; setRevision(value => value + 1); }
      } catch (error) {
        if (active) { warn(error); history.current = { key: `${playerId}:${today}`, value: null }; setRevision(value => value + 1); }
      }
    };
    void refresh();
    window.addEventListener('online', refresh);
    return () => { active = false; window.removeEventListener('online', refresh); };
  }, [playerId, today, warn]);
  const query = useCallback(async () => {
    if (!today || !playerId) return null;
    try {
      const db = localDb();
      if (db.userId !== playerId) return null;
      const dates = await readLocalStreakDates(db, today);
      const key = `${playerId}:${today}`;
      let remote = history.current?.key === key ? history.current.value : undefined;
      if (remote === undefined) {
        try { remote = cachedHistory(`kochivo-streak-${playerId}`); } catch { /* Wait for the remote read if the cache is unavailable. */ }
      }
      if (!remote) return remote;
      if (localDb().userId !== playerId) return null;
      return { accountStart: remote.accountStart,
        completedDates: [...new Set([...remote.dates, ...dates])] };
    } catch (error) {
      warn(error);
      return null;
    }
  }, [today, playerId, warn]);
  const result: unknown = useLiveQuery(query, warn, revision);
  if (result === undefined) return undefined;
  if (!result || typeof result !== 'object' || !('accountStart' in result) || !isDate(result.accountStart) ||
    !('completedDates' in result) || !Array.isArray(result.completedDates) || !result.completedDates.every(isDate)) return null;
  return { accountStart: result.accountStart, completedDates: result.completedDates };
}
