'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const RankScreen = dynamic(() => import('./rank-screen').then(module => module.RankScreen), {
  loading: () => <LoadingState />,
});
