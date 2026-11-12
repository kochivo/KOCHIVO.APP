'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const WorkspaceRosterEntry = dynamic(() => import('./roster').then(module => module.WorkspaceRoster), {
  loading: () => <LoadingState variant="list" />,
});
