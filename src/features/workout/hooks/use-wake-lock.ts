'use client';

import { useEffect } from 'react';

export function useWakeLock() {
  useEffect(() => {
    let disposed = false;
    let requesting = false;
    let lock: WakeLockSentinel | undefined;
    const request = async () => {
      if (disposed || requesting || !('wakeLock' in navigator) || document.visibilityState !== 'visible' ||
        (lock && !lock.released)) return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (disposed) await next.release();
        else lock = next;
      } catch { /* Unsupported and denied wake locks need no player action. */ }
      finally { requesting = false; }
    };
    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}
