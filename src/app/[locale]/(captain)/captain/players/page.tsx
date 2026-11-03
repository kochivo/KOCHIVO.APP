import { Suspense } from 'react';
import { fetchCaptainFirstName, fetchRoster, RosterScreen } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';
import { JoinRequests } from '@/features/coach-page';

export default function PlayersPage() {
  const data = Promise.all([fetchRoster(), fetchCaptainFirstName()]);
  return <Suspense fallback={<LoadingState variant="list" />}>
    <RosterScreen data={data} today={localDate(new Date())} />
    <JoinRequests />
  </Suspense>;
}
