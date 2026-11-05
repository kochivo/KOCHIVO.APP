'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui';

export const OfflineWorkout = dynamic(() => import('./offline-workout').then(module => module.OfflineWorkout), {
  ssr: false, loading: () => <LoadingState />,
});
