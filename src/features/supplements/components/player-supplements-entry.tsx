'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const PlayerSupplements = dynamic(() => import('./player-supplements').then(module => module.PlayerSupplements), {
  loading: () => <LoadingState />,
});
