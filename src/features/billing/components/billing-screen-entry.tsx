'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export const BillingScreen = dynamic(() => captainWorkspaceEnabled()
  ? import('./workspace-billing').then(module => module.WorkspaceBilling)
  : import('./billing-screen').then(module => module.BillingScreen), {
  loading: () => <LoadingState variant="cards" />,
});
