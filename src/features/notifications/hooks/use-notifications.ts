'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { latestNotifications, markRead, unreadCount } from '../data/notifications';
import { markOptimistically } from '../data/read-state';
import type { ReadState } from '../types';

export function useNotifications(open: boolean) {
  const [data, setData] = useState<ReadState>({ rows: [], count: 0 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false);
  const isOpen = useRef(open);
  const version = useRef(0);
  const invalidate = useCallback(() => { version.current++; }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    const request = ++version.current;
    try {
      const [count, rows] = await Promise.all([unreadCount(), isOpen.current ? latestNotifications() : Promise.resolve(null)]);
      if (request !== version.current) return;
      setData(previous => ({ count, rows: rows ?? previous.rows }));
      if (rows) setLoaded(true);
      setStatus('ready');
    } catch {
      if (request === version.current) setStatus('error');
    }
  }, []);
  useEffect(() => {
    isOpen.current = open;
    const update = () => { if (document.visibilityState === 'visible') void refresh(); };
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    const timer = window.setInterval(update, 120_000);
    return () => {
      invalidate();
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [open, refresh, invalidate]);
  async function read(id?: string) {
    if (busy.current) return false;
    busy.current = true;
    version.current++;
    setPending(true);
    setSaveError(false);
    const ok = await markOptimistically(data, id, setData, () => markRead(id));
    setSaveError(!ok);
    busy.current = false;
    setPending(false);
    return ok;
  }
  return { ...data, status: open && !loaded && status !== 'error' ? 'loading' as const : status, pending, saveError, refresh, read };
}
