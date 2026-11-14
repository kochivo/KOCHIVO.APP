import { Suspense, type ReactNode } from 'react';
import { LoadingState } from '@/ui/loading-state';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { CaptainWorkspaceFrame } from './captain-workspace-frame';

export async function CaptainShell({ children, sidebarFooter }: { children: ReactNode; sidebarFooter?: ReactNode }) {
  if (captainWorkspaceEnabled()) return <Suspense fallback={<LoadingState />}><CaptainWorkspaceFrame sidebarFooter={sidebarFooter}>{children}</CaptainWorkspaceFrame></Suspense>;
  const { CaptainLegacyShell } = await import('./captain-legacy-shell');
  return CaptainLegacyShell({ children, sidebarFooter });
}
