'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const ProgressScreen = dynamic(() => import('./progress-screen').then(module => module.ProgressScreen), {
  loading: () => <LoadingState />,
});
