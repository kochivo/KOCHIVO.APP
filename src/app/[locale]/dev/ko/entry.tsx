'use client';

import dynamic from 'next/dynamic';
import type { KoRole } from '@/features/ko-core';
import { LoadingState } from '@/ui/loading-state';

const Demo = dynamic(() => import('./demo').then(module => module.KoDemo), {
  ssr: false, loading: () => <LoadingState />,
});

export function KoDemo(props: { initialRole: KoRole }) {
  return <Demo {...props} />;
}
