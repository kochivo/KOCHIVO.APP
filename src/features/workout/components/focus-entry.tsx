'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui';

// Keep the two route screens out of the public API's shared initial client graph.
export const FocusScreen = dynamic(() => import('./focus-screen').then(module => module.FocusScreen), {
  ssr: false,
  loading: () => <LoadingState />,
});
