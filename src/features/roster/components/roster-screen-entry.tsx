import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { LoadingState } from '@/ui/loading-state';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import type { RosterResult } from '../types';
import { loadRosterExtras } from '../data/v6-roster';
import { WorkspaceRosterEntry } from '../v6/roster-entry';
import { JoinRequestsList } from '@/features/coach-page';

const LegacyRoster = dynamic(() => import('./roster-screen').then(module => module.RosterScreen), {
  loading: () => <LoadingState variant="list" />,
});

export async function RosterScreen(props: { data: Promise<[RosterResult, string]>; today: string; plan?: ReactNode }) {
  if (!captainWorkspaceEnabled()) return <LegacyRoster {...props} />;
  return <WorkspaceRosterEntry data={props.data} today={props.today} extras={await loadRosterExtras()} RequestList={JoinRequestsList} />;
}
