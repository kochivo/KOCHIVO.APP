'use client';

import { localDb } from '@/core/offline';
import { useCaptainContext } from '../hooks/use-my-captain';
import { useCoachUnread } from '../hooks/use-coach-unread';
import { CoachButtonView } from './coach-button-view';

export function CoachButton() {
  const captain = useCaptainContext();
  const playerId = captain.data?.captainId ? localDb().userId : undefined;
  const unread = useCoachUnread(playerId, captain.data?.captainId);
  return <CoachButtonView name={captain.data?.fullName} avatarUrl={captain.data?.avatarUrl}
    unread={unread.data} loading={captain.status === 'loading' || unread.status === 'loading'} />;
}
