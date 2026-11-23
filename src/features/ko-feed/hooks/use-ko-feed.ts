'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useLocale } from '@/core/i18n/client';
import { dismissFeedItem, snoozeOptimistically } from '../data/dismiss';
import { loadFeed } from '../data/load-feed';
import { loadTaskCount } from '../data/load-task-count';
import type { KoFeedItem } from '../types';
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
      void import('../data/load-digest-extras').then(module => module.loadDigestExtras())
        .then(extras => { if (active) publish({ ...state, extras }); })
        .catch(() => { if (active) publish({ ...state, extras: null }); });
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
  const locale = useLocale();
  const count = useSyncExternalStore(subscribeTaskCount, getTaskCountState, serverTaskCountSnapshot);
  useEffect(() => {
    if (!enabled) return undefined;
    return watchTaskCount(locale);
  }, [enabled, locale]);
  // Unknown while loading (null) shows no badge, same as zero: the launcher
  // renders the count only when it is greater than zero.
  return enabled ? count ?? 0 : 0;
}

// The KO launcher badge counts pending queue tasks (T-429), not urgent feed
// rows: the feed and the queue count different sets, so the badge disagreed
// with the dashboard and the queue. This store polls the same task-count
// endpoint the sidebar badge reads, on the same 120s cadence as the feed.
type TaskCountState = { count: number | null };
const initialTaskCount: TaskCountState = { count: null };
let taskCountState = initialTaskCount;
let taskCountVersion = 0;
let taskCountUsers = 0;
let stopTaskCountPolling: (() => void) | undefined;
const taskCountListeners = new Set<() => void>();
function publishTaskCount(next: number | null) {
  taskCountState = { count: next };
  taskCountListeners.forEach(listener => listener());
}
function subscribeTaskCount(listener: () => void) {
  taskCountListeners.add(listener);
  return () => { taskCountListeners.delete(listener); };
}
export const getTaskCountState = () => taskCountState.count;
const serverTaskCountSnapshot = () => null;
export async function refreshTaskCount(locale: string, fetcher: typeof fetch = fetch) {
  const current = taskCountVersion;
  const count = await loadTaskCount(locale, fetcher);
  if (count !== null && current === taskCountVersion) publishTaskCount(count);
}
export function watchTaskCount(locale: string, fetcher: typeof fetch = fetch) {
  taskCountUsers++;
  const update = () => { if (document.visibilityState === 'visible') void refreshTaskCount(locale, fetcher); };
  update();
  if (!stopTaskCountPolling) {
    const timer = window.setInterval(update, 120_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    stopTaskCountPolling = () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }
  return () => {
    if (--taskCountUsers === 0) {
      stopTaskCountPolling?.(); stopTaskCountPolling = undefined;
      taskCountVersion++; taskCountState = initialTaskCount;
    }
  };
}
