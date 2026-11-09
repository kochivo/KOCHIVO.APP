import { Suspense } from 'react';
import { fetchCaptainFirstName, fetchRoster } from '@/features/roster';
import { RosterScreen } from '../../../../../features/roster/components/roster-screen';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';
import { JoinRequests } from '@/features/coach-page';
import { TeamCrownLink } from '@/features/rank-review';

export default function PlayersPage() {
  const data = Promise.all([fetchRoster(), fetchCaptainFirstName()]);
  return <Suspense fallback={<LoadingState variant="list" />}>
    <TeamCrownLink />
    <RosterScreen data={data} today={localDate(new Date())} />
    <JoinRequests />
  </Suspense>;
}
