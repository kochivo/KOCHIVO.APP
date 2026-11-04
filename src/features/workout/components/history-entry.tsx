'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui';

export const HistoryScreen = dynamic(() => import('./history-screen').then(module => module.HistoryScreen), {
  ssr: false,
  loading: () => <LoadingState />,
});
