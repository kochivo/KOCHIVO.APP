'use client';

import { useCallback, useEffect, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { installPlatform } from '../platform';
import { shouldShowInstall } from '../policy';

interface PromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
interface Dismissal { dismissals: number; lastDismissedAt: number | null }
const empty: Dismissal = { dismissals: 0, lastDismissedAt: null };
const key = 'kochivo.install';
export const countFinished = async () => {
  // Captains never bind a local workout database.
  let db;
  try { db = localDb(); } catch { return 0; }
  return db.workout_sessions.filter((row) => row.completed_at !== null).count();
};

export function useInstallPrompt(role: 'captain' | 'player' = 'player') {
  const [browser, setBrowser] = useState({ userAgent: '', maxTouchPoints: 0, standalone: false, ready: false });
  const [event, setEvent] = useState<PromptEvent | null>(null);
  const [history, setHistory] = useState(empty);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const finishedWorkouts = useLiveQuery(countFinished);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const refresh = () => {
      const nav = navigator as Navigator & { standalone?: boolean };
      setBrowser({ userAgent: nav.userAgent, maxTouchPoints: nav.maxTouchPoints,
        standalone: media.matches || nav.standalone === true, ready: true });
      setNow(Date.now());
    };
    let active = true;
    const initialize = () => {
      if (!active) return;
      try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (value && typeof value === 'object' && 'dismissals' in value && 'lastDismissedAt' in value &&
        typeof value.dismissals === 'number' && Number.isInteger(value.dismissals) && value.dismissals >= 0 &&
        (value.lastDismissedAt === null || (typeof value.lastDismissedAt === 'number' && Number.isFinite(value.lastDismissedAt)))) {
        setHistory({ dismissals: value.dismissals, lastDismissedAt: value.lastDismissedAt });
      }
      } catch { /* Storage can be unavailable in private browsing. */ }
      refresh();
    };
    const capture = (pending: Event) => {
      pending.preventDefault();
      setEvent(pending as PromptEvent);
      refresh();
    };
    const installed = () => {
      setEvent(null);
      setBrowser((current) => ({ ...current, standalone: true }));
    };
    queueMicrotask(initialize);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);
    window.addEventListener('focus', refresh);
    media.addEventListener('change', refresh);
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', installed);
      window.removeEventListener('focus', refresh);
      media.removeEventListener('change', refresh);
    };
  }, []);

  const dismiss = useCallback(() => {
    const next = { dismissals: history.dismissals + 1, lastDismissedAt: Date.now() };
    setHistory(next);
    setNow(next.lastDismissedAt);
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch { /* Keep the dismissal for this session when storage is blocked. */ }
  }, [history]);

  const install = async () => {
    if (!event || busy) return;
    setBusy(true);
    setError(false);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'dismissed') dismiss();
      setEvent(null);
    } catch { setError(true); }
    finally { setBusy(false); }
  };
  const platform = installPlatform({ ...browser, hasPromptEvent: event !== null });
  const visible = browser.ready && shouldShowInstall({ role, finishedWorkouts: finishedWorkouts ?? 0,
    platform, ...history, now });
  return { visible, platform, dismiss, install, busy, error };
}
