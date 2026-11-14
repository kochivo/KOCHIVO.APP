import { getTimezone } from '@/core/timezone/server';
import { Suspense } from 'react';
import { fetchCaptainFirstName, fetchRoster, RosterScreen } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';
import { JoinRequests } from '@/features/coach-page';
import { TeamCrownLink } from '@/features/rank-review';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function PlayersPage() {
  const data = Promise.all([fetchRoster(), fetchCaptainFirstName()]);
  const workspace = captainWorkspaceEnabled();
  return <Suspense fallback={<LoadingState variant="list" />}>
    {!workspace && ranksEnabled() && <TeamCrownLink />}
    <RosterScreen data={data} today={localDate(new Date(), await getTimezone())} />
    {!workspace && <JoinRequests />}
  </Suspense>;
}
