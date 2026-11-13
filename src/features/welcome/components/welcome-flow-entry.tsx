'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const WelcomeFlow = dynamic(() => import('./welcome-flow').then(module => module.WelcomeFlow), {
  loading: () => <LoadingState />,
});
