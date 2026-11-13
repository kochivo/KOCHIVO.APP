'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

// The home imports this barrel for useCaptainContext; loading the screen lazily keeps it out of the home first load.
export const CaptainScreen = dynamic(() => import('./captain-screen').then(module => module.CaptainScreen), {
  loading: () => <LoadingState variant="detail" />,
});
