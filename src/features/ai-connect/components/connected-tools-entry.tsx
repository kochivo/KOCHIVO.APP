'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const ConnectedTools = dynamic(() => import('./connected-tools').then(module => module.ConnectedTools), {
  loading: () => <LoadingState variant="detail" />,
});
