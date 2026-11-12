'use client';
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { LoadingState } from '@/ui/loading-state';
const Screen = lazy(() => import('./workspace-screen').then(module => ({ default: module.WorkspaceScreen })));
export function WorkspaceInboxEntry(props: { joinRequests: ReactNode; tools: ReactNode }) {
  return <Suspense fallback={<LoadingState variant="list" />}><Screen {...props} /></Suspense>;
}
