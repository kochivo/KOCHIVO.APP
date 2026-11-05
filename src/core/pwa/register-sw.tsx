'use client';

import { useEffect } from 'react';

/** Registers /sw.js in production only, so dev hot-reload is never served stale assets. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
      console.error('Service worker registration failed', error);
    });
  }, []);
  return null;
}
