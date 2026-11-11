'use client';
import { useTimezone } from '@/core/timezone/client';

import { useCallback, useEffect, useState } from 'react';
import { localDb, parkedCount, retryParked, pendingCount, useLiveQuery } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { localDate } from '@/lib/dates';
import { refreshNutrition } from '../data/refresh-nutrition';

const readPending = () => pendingCount(localDb());
const readParked = () => parkedCount(localDb());

export function useNutritionSnapshot() {
  const timezone = useTimezone();
  const [playerId, setPlayerId] = useState<string>();
  const [today, setToday] = useState('');
  const [online, setOnline] = useState(true);
  const [settled, setSettled] = useState(false);
  const [stale, setStale] = useState(false);
  const [localError, setLocalError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const onError = useCallback(() => setLocalError(true), []);
  const read = useCallback(async () => {
    const cached = await localDb().nutrition_snapshot.get('active');
    return cached?.player_id === playerId ? cached : null;
  }, [playerId]);
  const cached = useLiveQuery(read, onError, retryKey);
  const snapshot = cached?.player_id === playerId ? cached : null;
  const pending = useLiveQuery(readPending, onError, retryKey);
  const parked = useLiveQuery(readParked, onError, retryKey);
  const retrySync = () => { void retryParked(localDb()).catch(onError); };
  const refresh = useCallback(() => refreshNutrition().then((result) => {
    setStale(result === 'error' || result === 'offline');
    setSettled(true);
  }), []);
  const retry = useCallback(() => {
    setLocalError(false);
    setRetryKey((key) => key + 1);
    void refresh();
  }, [refresh]);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void loadSupabaseBrowser().then(async client => {
      if (!active) return;
      const { data: listener } = client.auth.onAuthStateChange((_event, session) => setPlayerId(session?.user.id));
      unsubscribe = () => listener.subscription.unsubscribe();
      const { data, error } = await client.auth.getSession();
      if (active) {
        if (error) onError();
        setPlayerId(data.session?.user.id);
      }
    }).catch(() => { if (active) onError(); });
    const update = () => { setToday(localDate(new Date(), timezone)); setOnline(navigator.onLine); };
    update();
    void refresh();
    const reconnect = () => { update(); void refresh(); };
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [refresh, onError, timezone]);
  const status = localError || (settled && stale && !snapshot) ? 'error' :
    cached === undefined || !today || (!settled && !snapshot) ? 'loading' : snapshot ? 'ready' : 'empty';
  return { snapshot, status, stale: stale || !online, online, pending, parked, retrySync, today, retry, retryKey, onError };
}
