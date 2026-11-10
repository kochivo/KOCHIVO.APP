'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const CopyLinkButton = dynamic(() => import('./copy-link-button').then(module => module.CopyLinkButton), {
  loading: () => <LoadingState />,
});
