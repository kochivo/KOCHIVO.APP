'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const V6Wizard = dynamic(() => import('./intake-v6').then(module => module.IntakeV6), {
  ssr: false, loading: () => <LoadingState />,
});

const Wizard = dynamic(() => import('./intake-wizard').then(module => module.IntakeWizard), {
  ssr: false, loading: () => <LoadingState />,
});

export function IntakeWizard(props: { statusError?: string }) {
  if (captainWorkspaceEnabled()) return <V6Wizard {...props} />;
  return <Wizard {...props} />;
}
