'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

const Wizard = dynamic(() => import('./intake-wizard').then(module => module.IntakeWizard), {
  ssr: false, loading: () => <LoadingState />,
});

export function IntakeWizard(props: { statusError?: string }) {
  return <Wizard {...props} />;
}
