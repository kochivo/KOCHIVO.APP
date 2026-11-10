'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const PlayerInviteFlow = dynamic(() => import('./player-invite-flow').then(module => module.PlayerInviteFlow), {
  loading: () => <LoadingState />,
});
