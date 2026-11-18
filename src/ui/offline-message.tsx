'use client';
import { useSyncExternalStore } from 'react';
import { useT } from '@/core/i18n/client';
import { readDeviceRole } from '@/core/pwa/device-role';
import { messages } from '@/core/pwa/messages';

const subscribe = () => () => {};
const serverRole = () => null;

export function OfflineMessage({ verifiedWorkoutCopy }: { verifiedWorkoutCopy?: string | null } = {}) {
  const t = useT(messages);
  const role = useSyncExternalStore(subscribe, readDeviceRole, serverRole);
  return <p className="text-muted">{verifiedWorkoutCopy ?? t(verifiedWorkoutCopy === undefined && role === 'player' ? 'todaySWorkoutIsSavedOn'
    : role === 'captain' ? 'offlineCaptain' : 'offlineGeneric')}</p>;
}
