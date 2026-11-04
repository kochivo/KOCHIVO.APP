'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { extendRest, restRemaining } from '../rest';
import { playRestChime, prepareRestChime } from '../rest-chime';

const storageKey = 'kochivo:rest-ends-at';
const totalKey = 'kochivo:rest-total';
const soundKey = 'kochivo:rest-sound';
const defaultNow = () => Date.now();

export function useRestTimer({ now = defaultNow, chime = playRestChime, prepare = prepareRestChime }: {
  now?: () => number; chime?: () => void; prepare?: () => void;
} = {}) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [sound, setSound] = useState(true);
  const duration = useRef(0);
  const soundEnabled = useRef(true);
  const deadline = useRef<number | null>(null);
  const notified = useRef(false);
  const update = useCallback((next: number | null, seconds = 0) => {
    deadline.current = next;
    notified.current = false;
    setEndsAt(next);
    duration.current = seconds;
    setTotal(seconds);
    setRemaining(restRemaining(next, now()));
    try {
      if (next === null) { sessionStorage.removeItem(storageKey); sessionStorage.removeItem(totalKey); }
      else { sessionStorage.setItem(storageKey, String(next)); sessionStorage.setItem(totalKey, String(seconds)); }
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, [now]);
  useEffect(() => {
    const restore = () => {
      try {
        const stored = sessionStorage.getItem(storageKey);
        const value = Number(stored);
        // A rest that already ended while the page was closed must not vibrate on reopen.
        if (stored && Number.isFinite(value) && value > now()) {
          const savedTotal = Number(sessionStorage.getItem(totalKey));
          update(value, Math.max(restRemaining(value, now()), Number.isFinite(savedTotal) ? savedTotal : 0));
        } else if (stored) { sessionStorage.removeItem(storageKey); sessionStorage.removeItem(totalKey); }
      } catch { /* The in-memory timer still works without storage. */ }
    };
    restore();
    try { soundEnabled.current = localStorage.getItem(soundKey) !== 'off'; setSound(soundEnabled.current); }
    catch { /* Keep the default when storage is unavailable. */ }
    const tick = () => {
      const seconds = restRemaining(deadline.current, now());
      setRemaining(seconds);
      if (deadline.current !== null && seconds === 0 && !notified.current) {
        notified.current = true;
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* Optional device capability. */ }
        if (soundEnabled.current) { try { chime(); } catch { /* Optional audio. */ } }
        try { sessionStorage.removeItem(storageKey); sessionStorage.removeItem(totalKey); } catch { /* Optional storage. */ }
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [update, now, chime]);
  return { endsAt, remaining, total, sound, flashing: remaining > 0 && remaining <= 3,
    toggleSound: () => {
      soundEnabled.current = !soundEnabled.current;
      setSound(soundEnabled.current);
      if (soundEnabled.current) prepare();
      try { localStorage.setItem(soundKey, soundEnabled.current ? 'on' : 'off'); } catch { /* Optional storage. */ }
    },
    start: (seconds: number) => {
      if (soundEnabled.current) prepare();
      update(seconds > 0 ? now() + seconds * 1000 : null, Math.max(0, seconds));
    },
    extend: () => { if (soundEnabled.current) prepare(); update(extendRest(deadline.current, now(), 30),
      (restRemaining(deadline.current, now()) > 0 ? duration.current : 0) + 30); },
    skip: () => update(null) };
}
