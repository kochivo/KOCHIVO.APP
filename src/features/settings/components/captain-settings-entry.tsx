'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const CaptainSettings = dynamic(() => import('./captain-settings').then(module => module.CaptainSettings), {
  loading: () => <LoadingState variant="detail" />,
});
