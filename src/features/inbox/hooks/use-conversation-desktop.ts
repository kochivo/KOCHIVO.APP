'use client';
import { useSyncExternalStore } from 'react';

const query = '(min-width: 760px)';
function subscribe(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
export function useConversationDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
