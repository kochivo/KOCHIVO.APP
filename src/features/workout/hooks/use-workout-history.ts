'use client';
import { useCallback, useEffect, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { emptyHistory, localHistory, remoteHistory } from '../data/history';
import type { HistoryData } from '../data/history';
import { groupHistory, mergeHistoryRows } from '../data/history-grouping';

const readSnapshot = () => localDb().program_snapshot.get('active');

export function useWorkoutHistory(playerId: string, limit: number, allSessions: boolean) {
  const [remote, setRemote] = useState<HistoryData>();
  const [failed, setFailed] = useState(false);
  const [localFailed, setLocalFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const onError = useCallback(() => setLocalFailed(true), []);
  const snapshot = useLiveQuery(readSnapshot, onError, retryKey);
  const ownerId = playerId || snapshot?.player_id || '';
  const read = useCallback(() => localHistory(localDb(), ownerId), [ownerId]);
  const local = useLiveQuery(read, onError, retryKey);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = !ownerId || (typeof navigator !== 'undefined' && !navigator.onLine) ? emptyHistory :
          await remoteHistory(await loadSupabaseBrowser(), ownerId, limit, allSessions);
        if (active) { setRemote(rows); setFailed(false); }
      } catch { if (active) setFailed(true); }
    };
    void load();
    window.addEventListener('online', load);
    return () => { active = false; window.removeEventListener('online', load); };
  }, [ownerId, limit, allSessions, retryKey]);
  const sessions = mergeHistoryRows(remote?.sessions ?? [], local?.sessions ?? []);
  const sets = mergeHistoryRows(remote?.sets ?? [], local?.sets ?? []);
  return { workouts: groupHistory(sessions, sets),
    names: [...(local?.names ?? []), ...(remote?.names ?? [])], days: [...(local?.days ?? []), ...(remote?.days ?? [])],
    loading: !localFailed && (!local || (!ownerId && snapshot === undefined) || (!remote && !failed && !local.sessions.some(row => row.completed_at))), error: failed || localFailed,
    hasMore: (remote?.sessions.length ?? 0) >= limit,
    retry: () => { setLocalFailed(false); setRetryKey(key => key + 1); } };
}
