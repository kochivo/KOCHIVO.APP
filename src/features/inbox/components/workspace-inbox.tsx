import 'server-only';
import { Suspense } from 'react';
import { JoinRequests } from '@/features/coach-page';
import { QueueEntry } from '@/features/captain-workspace/server';
import { LoadingState } from '@/ui/loading-state';
import { WorkspaceInboxEntry } from './workspace-entry';
export function WorkspaceInbox() {
  return <WorkspaceInboxEntry joinRequests={<Suspense fallback={<LoadingState />}><JoinRequests /></Suspense>} tools={<QueueEntry />} />;
}
