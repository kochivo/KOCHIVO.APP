'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const BillingScreen = dynamic(() => import('./billing-screen').then(module => module.BillingScreen), {
  loading: () => <LoadingState variant="cards" />,
});
