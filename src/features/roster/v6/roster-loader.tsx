'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const RosterLoader = dynamic(() => import('./roster').then(module => module.WorkspaceRoster), {
  loading: () => <LoadingState variant="list" />,
});
