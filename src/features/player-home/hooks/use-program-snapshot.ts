'use client';

import { useCallback, useEffect, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { refreshSnapshot } from '../data/refresh-snapshot';

export function useProgramSnapshot(playerId: string | undefined, retryKey = 0) {
  const [failed, setFailed] = useState(false);
  const [settled, setSettled] = useState(false);
  const onError = useCallback(() => { setFailed(true); setSettled(true); }, []);
  const readSnapshot = useCallback(async () => {
    const cached = await localDb().program_snapshot.get('active');
    return cached?.player_id === playerId ? cached ?? null : null;
  }, [playerId]);
  const cached = useLiveQuery(readSnapshot, onError, retryKey);
  const snapshot = cached && cached.player_id !== playerId ? null : cached;
  const retry = useCallback(() => refreshSnapshot().then((result) => {
    setFailed(result === 'error' || result === 'offline');
    setSettled(true);
  }), []);
  useEffect(() => {
    void retry();
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [retry]);
  const status: 'loading' | 'ready' | 'empty' | 'error' = failed ? 'error' : snapshot ? 'ready' :
    snapshot === undefined || !settled ? 'loading' : 'empty';
  return { snapshot, status, retry };
}
