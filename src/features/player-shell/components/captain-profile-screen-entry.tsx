'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const CaptainProfileScreen = dynamic(() => import('./captain-profile-screen').then(module => module.CaptainProfileScreen), {
  loading: () => <LoadingState variant="detail" />,
});
