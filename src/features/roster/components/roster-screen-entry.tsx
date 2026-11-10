'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const RosterScreen = dynamic(() => import('./roster-screen').then(module => module.RosterScreen), {
  loading: () => <LoadingState variant="list" />,
});
