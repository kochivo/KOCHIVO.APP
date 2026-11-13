'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const AssessmentsScreen = dynamic(() => import('./assessments-screen').then(module => module.AssessmentsScreen), {
  loading: () => <LoadingState variant="detail" />,
});
