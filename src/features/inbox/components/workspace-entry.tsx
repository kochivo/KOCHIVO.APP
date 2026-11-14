'use client';
import { lazy, Suspense } from 'react';
import type { ConversationProps } from '../conversation-types';
import { LoadingState } from '@/ui/loading-state';
const Screen = lazy(() => import('./conversation-screen').then(module => ({ default: module.ConversationScreen })));
export function WorkspaceInboxEntry(props: ConversationProps) {
  return <Suspense fallback={<LoadingState variant="list" />}><Screen {...props} /></Suspense>;
}
