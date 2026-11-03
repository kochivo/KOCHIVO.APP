import { Suspense } from 'react';
import { CaptainShell, fetchCaptainFirstName, fetchRoster, RosterScreen } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';

export default function CaptainPage() {
  const data = Promise.all([fetchRoster(), fetchCaptainFirstName()]);
  return <CaptainShell><Suspense fallback={<LoadingState />}>
    <RosterScreen data={data} today={localDate(new Date())} />
  </Suspense></CaptainShell>;
}
