'use client';

import { useCallback, useSyncExternalStore } from 'react';

export const pageBarTargets = { title: 'page-bar-title', actions: 'page-bar-actions' } as const;

export function subscribePageBarTargets(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return () => observer.disconnect();
}

const serverTarget = () => null;

// Observe the DOM so slots also work when the bar streams in after the page.
export function usePageBarTarget(slot: keyof typeof pageBarTargets) {
  const snapshot = useCallback(() => document.getElementById(pageBarTargets[slot]), [slot]);
  return useSyncExternalStore(subscribePageBarTargets, snapshot, serverTarget);
}
