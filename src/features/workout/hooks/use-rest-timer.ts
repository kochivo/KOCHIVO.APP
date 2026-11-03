'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { extendRest, restRemaining } from '../rest';

const storageKey = 'kochivo:rest-ends-at';

export function useRestTimer() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const deadline = useRef<number | null>(null);
  const notified = useRef(false);
  const update = useCallback((next: number | null) => {
    deadline.current = next;
    notified.current = false;
    setEndsAt(next);
    setRemaining(restRemaining(next, Date.now()));
    try {
      if (next === null) sessionStorage.removeItem(storageKey);
      else sessionStorage.setItem(storageKey, String(next));
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, []);
  useEffect(() => {
    const restore = () => {
      try {
        const stored = sessionStorage.getItem(storageKey);
        const value = Number(stored);
        // A rest that already ended while the page was closed must not vibrate on reopen.
        if (stored && Number.isFinite(value) && value > Date.now()) update(value);
        else if (stored) sessionStorage.removeItem(storageKey);
      } catch { /* The in-memory timer still works without storage. */ }
    };
    restore();
    const tick = () => {
      const seconds = restRemaining(deadline.current, Date.now());
      setRemaining(seconds);
      if (deadline.current !== null && seconds === 0 && !notified.current) {
        notified.current = true;
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* Optional device capability. */ }
        try { sessionStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [update]);
  return { endsAt, remaining, flashing: remaining > 0 && remaining <= 3,
    start: (seconds: number) => update(seconds > 0 ? Date.now() + seconds * 1000 : null),
    extend: () => update(extendRest(deadline.current, Date.now(), 30)),
    skip: () => update(null) };
}
