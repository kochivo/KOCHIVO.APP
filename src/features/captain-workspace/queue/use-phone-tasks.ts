import { useSyncExternalStore } from 'react';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const query = '(width < 48rem)';

function subscribe(onChange: () => void) {
  if (!captainWorkspaceEnabled() || !window.matchMedia) return () => {};
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function usePhoneTasks() {
  return useSyncExternalStore(subscribe, () => captainWorkspaceEnabled() && Boolean(window.matchMedia?.(query).matches), () => false);
}

function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function usePhoneTaskHash(phone: boolean) {
  return useSyncExternalStore(phone ? subscribeHash : () => () => {}, () => phone ? window.location.hash : '', () => '');
}
