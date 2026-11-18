import { useSyncExternalStore } from 'react';

const query = '(min-width: 760px)';
const dismissalKey = (userId: string) => `kochivo.ko-teaser.dismissed.${userId}`;

export function dismissDesktopTeaser(userId: string) {
  try { window.localStorage.setItem(dismissalKey(userId), '1'); } catch { /* Storage may be blocked. */ }
}

function subscribe(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}

const ignoreChanges = () => () => {};

function desktopSnapshot(userId: string) {
  if (!window.matchMedia(query).matches) return 'phone';
  try {
    if (window.localStorage.getItem(dismissalKey(userId)) === '1') return 'dismissed';
  } catch { /* The card can still be closed for this visit. */ }
  return 'desktop';
}

export function useTeaserDesktop(enabled: boolean, userId: string) {
  return useSyncExternalStore(enabled ? subscribe : ignoreChanges,
    () => enabled ? desktopSnapshot(userId) : 'phone', () => 'phone');
}
