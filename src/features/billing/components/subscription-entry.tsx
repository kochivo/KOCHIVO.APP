'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const SubscriptionEntry = dynamic(() => import('./subscription-view').then(module => module.SubscriptionView), {
  loading: () => <LoadingState variant="detail" />,
});
