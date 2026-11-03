'use client';
import { useCallback, useEffect, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { lastSession } from '../data/last-performance';
import type { LastSession } from '../data/last-performance';
import { remoteLastSession } from '../data/remote-last-session';

type Remote = { key: string; value: LastSession | null };

/**
 * Local history first; when this phone has none, ask the server once per exercise.
 * Only the local read gates the workout, so a slow network never blocks logging a set.
 */
export function useLastSession(playerId: string | undefined, exerciseId: string, sessionId: string, onError: () => void, retryKey: number) {
  const key = `${exerciseId}:${sessionId}`;
  const read = useCallback(async () => exerciseId ? { key, value: await lastSession(localDb(), exerciseId, sessionId) } : null,
    [exerciseId, sessionId, key]);
  const local = useLiveQuery(read, onError, retryKey);
  const [remote, setRemote] = useState<Remote | null>(null);
  const ready = !exerciseId || local?.key === key;
  const needsRemote = ready && Boolean(exerciseId && playerId) && !local?.value && remote?.key !== key;
  useEffect(() => {
    if (!needsRemote || !playerId || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    let active = true;
    void loadSupabaseBrowser().then((client) => remoteLastSession(client, { playerId, exerciseId, beforeSessionId: sessionId }))
      .then((value) => { if (active) setRemote({ key, value }); })
      .catch((error: unknown) => {
        console.warn('Loading last workout from the server failed', error);
        if (active) setRemote({ key, value: null });
      });
    return () => { active = false; };
  }, [needsRemote, playerId, exerciseId, sessionId, key]);
  const last = local?.key === key ? local.value ?? (remote?.key === key ? remote.value : null) : null;
  return { last, ready };
}
