import { getTimezone } from '@/core/timezone/server';
import { Suspense } from 'react';
import { PlanBadge } from '@/features/billing';
import { fetchDues, fetchPlanSummary } from '@/features/billing/server';
import { getLocale } from '@/core/i18n/server';
import { DashboardScreen } from '@/features/dashboard';
import { fetchCaptainFirstName, fetchRoster } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { LoadingState } from '@/ui';
import { CoachLinkCard, JoinRequests } from '@/features/coach-page';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function CaptainPage() {
  const data = Promise.all([fetchRoster(), fetchCaptainFirstName(), fetchDues()]);
  const plan = Promise.all([fetchPlanSummary(), getLocale()]);
  if (captainWorkspaceEnabled()) {
    const { WorkspaceHome } = await import('@/features/dashboard/server');
    return <Suspense fallback={<LoadingState variant="cards" />}>
      <WorkspaceHome data={data} today={localDate(new Date(), await getTimezone())}
        plan={<Suspense fallback={null}><PlanBadge data={plan} /></Suspense>}
        coachLink={<Suspense fallback={<LoadingState />}><CoachLinkCard /></Suspense>}
        joinRequests={<Suspense fallback={<LoadingState />}><JoinRequests /></Suspense>} />
    </Suspense>;
  }
  return <Suspense fallback={<LoadingState variant="cards" />}>
    <DashboardScreen data={data} today={localDate(new Date(), await getTimezone())} plan={<Suspense fallback={null}><PlanBadge data={plan} /></Suspense>}
      coachLink={<Suspense fallback={<LoadingState />}><CoachLinkCard /></Suspense>}
      joinRequests={<Suspense fallback={<LoadingState />}><JoinRequests /></Suspense>} />
  </Suspense>;
}
