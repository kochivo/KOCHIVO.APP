'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const LegacyEditor = dynamic(() => import('./legacy-editor').then(module => module.LegacyEditor), { loading: () => <LoadingState variant="detail" /> });
const V11Editor = dynamic(() => import('./v11-editor').then(module => module.V11Editor), { loading: () => <LoadingState variant="detail" /> });

export function EditorEntry({ planId }: { planId: string }) {
  return captainWorkspaceEnabled() ? <V11Editor key={planId} planId={planId} /> : <LegacyEditor key={planId} planId={planId} />;
}
