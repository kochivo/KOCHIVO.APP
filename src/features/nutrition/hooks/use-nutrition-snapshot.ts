'use client';

import { useCallback, useEffect, useState } from 'react';
import { localDb, pendingCount, useLiveQuery } from '@/core/offline';
import { supabaseBrowser } from '@/core/supabase/browser';
import { localDate } from '@/lib/dates';
import { refreshNutrition } from '../data/refresh-nutrition';

const readPending = () => pendingCount(localDb());

export function useNutritionSnapshot() {
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
    const client = supabaseBrowser();
    let active = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) onError();
      setPlayerId(data.session?.user.id);
    }).catch(onError);
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => setPlayerId(session?.user.id));
    const update = () => { setToday(localDate(new Date())); setOnline(navigator.onLine); };
    update();
    void refresh();
    const reconnect = () => { update(); void refresh(); };
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [refresh, onError]);
  const status = localError || (settled && stale && !snapshot) ? 'error' :
    cached === undefined || !today || (!settled && !snapshot) ? 'loading' : snapshot ? 'ready' : 'empty';
  return { snapshot, status, stale: stale || !online, online, pending, today, retry, retryKey, onError };
}
