'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const GenerateButton = dynamic(() => import('./generate-button').then(module => module.GenerateButton), {
  loading: () => <LoadingState />,
});
