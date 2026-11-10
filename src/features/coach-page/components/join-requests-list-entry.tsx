'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const JoinRequestsList = dynamic(() => import('./join-requests-list').then(module => module.JoinRequestsList), {
  loading: () => <LoadingState />,
});
