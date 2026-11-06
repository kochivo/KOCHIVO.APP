import { Suspense } from 'react';
import { PlanBadge } from '@/features/billing';
import { fetchDues } from '../../../../features/billing/data/dues';
import { fetchPlanSummary } from '../../../../features/billing/data/plan-summary';
import { getLocale } from '@/core/i18n/server';
import { DashboardScreen } from '@/features/dashboard';
import { fetchCaptainFirstName, fetchRoster } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';
import { CoachLinkCard, JoinRequests } from '@/features/coach-page';

export default function CaptainPage() {
  const data = Promise.all([fetchRoster(), fetchCaptainFirstName(), fetchDues()]);
  const plan = Promise.all([fetchPlanSummary(), getLocale()]);
  return <Suspense fallback={<LoadingState variant="cards" />}>
    <DashboardScreen data={data} today={localDate(new Date())} plan={<Suspense fallback={null}><PlanBadge data={plan} /></Suspense>}
      coachLink={<Suspense fallback={<LoadingState />}><CoachLinkCard /></Suspense>}
      joinRequests={<Suspense fallback={<LoadingState />}><JoinRequests /></Suspense>} />
  </Suspense>;
}
