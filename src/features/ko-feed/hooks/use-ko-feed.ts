'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { dismissFeedItem, snoozeOptimistically } from '../data/dismiss';
import { loadFeed } from '../data/load-feed';
import type { KoFeedItem } from '../types';
import { urgentCount } from '../rank';
import { loadDigestExtras } from '../data/load-digest-extras';
import type { DigestExtras } from '../digest';

type State = { rows: KoFeedItem[]; status: 'loading' | 'ready' | 'error'; saveError: boolean; extras: DigestExtras | null };
const initial: State = { rows: [], status: 'loading', saveError: false, extras: null };
let state = initial;
let version = 0;
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();
const hidden = new Set<string>();
let pollingUsers = 0;
let stopPolling: (() => void) | undefined;
function publish(next: State) { state = next; listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const getFeedState = () => state;
const serverSnapshot = () => initial;
export async function refreshFeed() {
  if (request) return request;
  const current = version;
  const pending = (async () => {
    try {
      const rows = await loadFeed();
      if (current === version) publish({ ...state, rows: rows.filter(row => !hidden.has(row.key)), status: 'ready' });
    } catch { if (current === version) publish({ ...state, status: 'error' }); }
  })();
  request = pending;
  void pending.finally(() => { if (request === pending) request = null; });
  return pending;
}
export function watchFeed() {
    pollingUsers++;
    const update = () => { if (document.visibilityState === 'visible') void refreshFeed(); };
    update();
    if (!stopPolling) {
      const timer = window.setInterval(update, 120_000);
      window.addEventListener('focus', update);
      document.addEventListener('visibilitychange', update);
      stopPolling = () => {
        window.clearInterval(timer);
        window.removeEventListener('focus', update);
        document.removeEventListener('visibilitychange', update);
      };
    }
    return () => {
      if (--pollingUsers === 0) {
        stopPolling?.(); stopPolling = undefined;
        version++; request = null; state = initial; hidden.clear();
      }
    };
}
export function useKoFeed(open = true, enabled = true, digest = false) {
  const data = useSyncExternalStore(subscribe, getFeedState, serverSnapshot);
  useEffect(() => enabled ? watchFeed() : undefined, [open, enabled]);
  useEffect(() => {
    if (!enabled || !digest) return;
    let active = true;
    const update = () => {
      if (document.visibilityState !== 'visible') return;
      void loadDigestExtras().then(extras => { if (active) publish({ ...state, extras }); });
    };
    update();
    const timer = window.setInterval(update, 120_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [enabled, digest]);
  const dismiss = useCallback(async (key: string) => {
    if (hidden.has(key)) return;
    hidden.add(key);
    version++;
    const ok = await snoozeOptimistically(() => state.rows, key,
      rows => publish({ ...state, rows: rows.filter(row => !hidden.has(row.key)), saveError: false }),
      async () => {
        try { await dismissFeedItem(key, Date.now()); }
        catch (error) { hidden.delete(key); throw error; }
      });
    if (!ok) publish({ ...state, saveError: true });
  }, []);
  return { ...data, refresh: refreshFeed, dismiss };
}
export function useKoFeedCount(enabled = true) {
  const { rows } = useKoFeed(false, enabled);
  return enabled ? urgentCount(rows) : 0;
}
