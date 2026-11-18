'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui';
import { OfflineMessage } from '@/ui/offline-message';

export const OfflineWorkout = dynamic(() => import('./offline-workout').then(module => module.OfflineWorkout), {
  ssr: false, loading: () => <><OfflineMessage verifiedWorkoutCopy={null} /><LoadingState /></>,
});
