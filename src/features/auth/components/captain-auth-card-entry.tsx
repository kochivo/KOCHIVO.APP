'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const CaptainAuthCard = dynamic(() => import('./captain-auth-card').then(module => module.CaptainAuthCard), {
  loading: () => <LoadingState />,
});
