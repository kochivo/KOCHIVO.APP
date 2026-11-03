import { Suspense } from 'react';
import { fetchDues, PlanBadge } from '@/features/billing';
import { DashboardScreen } from '@/features/dashboard';
import { fetchCaptainFirstName, fetchRoster } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';

export default function CaptainPage() {
  const data = Promise.all([fetchRoster(), fetchCaptainFirstName(), fetchDues()]);
  return <Suspense fallback={<LoadingState />}>
    <DashboardScreen data={data} today={localDate(new Date())} plan={<Suspense fallback={null}><PlanBadge /></Suspense>} />
  </Suspense>;
}
