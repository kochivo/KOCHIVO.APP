'use client';
import { useSyncExternalStore } from 'react';
const query = '(min-width: 64rem)';
function subscribe(listener: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
export function useDesktopDetail() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
