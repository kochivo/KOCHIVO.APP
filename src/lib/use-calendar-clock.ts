'use client';

import { useEffect, useState } from 'react';

/** Minute boundaries include Cairo midnight, even when the page stays foreground. */
export function useCalendarClock() {
  const [now, setNow] = useState<Date>();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => { setNow(new Date()); setOnline(navigator.onLine); };
    const resume = () => { if (document.visibilityState === 'visible') update(); };
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => { update(); timer = setTimeout(tick, 60_000 - Date.now() % 60_000); };
    tick();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);
  return { now, online };
}
