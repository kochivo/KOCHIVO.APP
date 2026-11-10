'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const KoChat = dynamic(() => import('./ko-chat').then(module => module.KoChat), {
  loading: () => <LoadingState />,
});
