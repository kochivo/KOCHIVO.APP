import { Suspense } from 'react';
import { PlanBadge } from '@/features/billing';
import { fetchCaptainFirstName, fetchRoster, RosterScreen } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';

export default function CaptainPage() {
  const data = Promise.all([fetchRoster(), fetchCaptainFirstName()]);
  return <Suspense fallback={<LoadingState />}>
    <RosterScreen data={data} today={localDate(new Date())} plan={<Suspense fallback={null}><PlanBadge /></Suspense>} />
  </Suspense>;
}
