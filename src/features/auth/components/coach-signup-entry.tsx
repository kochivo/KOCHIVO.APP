'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const CoachSignup = dynamic(() => import('./coach-signup').then(module => module.CoachSignup), {
  loading: () => <LoadingState />,
});
