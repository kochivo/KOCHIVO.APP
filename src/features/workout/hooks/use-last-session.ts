'use client';
import { useCallback, useEffect, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { lastSession, newerSession } from '../data/last-performance';
import type { LastSession } from '../data/last-performance';
import { remoteLastSession } from '../data/remote-last-session';

type Remote = { key: string; value: LastSession | null; skipDate?: (date: string) => boolean };

/**
 * Local history first; also check for newer workouts synced by other devices.
 * Only the local read gates the workout, so a slow network never blocks logging a set.
 */
export function useLastSession(playerId: string | undefined, exerciseId: string, sessionId: string, onError: () => void, retryKey: number, painSince?: string,
  skipDate?: (date: string) => boolean) {
  const key = `${playerId}:${exerciseId}:${sessionId}:${retryKey}${painSince ? `:${painSince}` : ''}`;
  const read = useCallback(async () => exerciseId ? { key, value: await lastSession(localDb(), exerciseId, sessionId, painSince, skipDate) } : null,
    [exerciseId, sessionId, key, painSince, skipDate]);
  const local = useLiveQuery(read, onError, retryKey);
  const [remote, setRemote] = useState<Remote | null>(null);
  const ready = !exerciseId || local?.key === key;
  const remoteMatches = remote?.key === key && remote.skipDate === skipDate;
  const needsRemote = ready && Boolean(exerciseId && playerId) && !remoteMatches;
  useEffect(() => {
    if (!needsRemote || !playerId) return;
    let active = true;
    const load = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      void loadSupabaseBrowser().then((client) => remoteLastSession(client, { playerId, exerciseId, beforeSessionId: sessionId, painSince, skipDate }))
      .then((value) => { if (active) setRemote({ key, value, skipDate }); })
      .catch((error: unknown) => {
        console.warn('Loading last workout from the server failed', error);
        if (active) setRemote({ key, value: null, skipDate });
      });
    };
    load();
    if (typeof window !== 'undefined') window.addEventListener('online', load);
    return () => {
      active = false;
      if (typeof window !== 'undefined') window.removeEventListener('online', load);
    };
  }, [needsRemote, playerId, exerciseId, sessionId, key, painSince, skipDate]);
  const last = local?.key === key ? newerSession(local.value, remoteMatches ? remote.value : null) : null;
  return { last, ready };
}
