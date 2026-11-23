import { Suspense, type ReactNode } from 'react';
import { PageContainer } from '@/ui';
import { CaptainShell, captainApproval } from '@/features/roster';
import { DemoMode } from '@/features/demo';
import { ProductTour } from '@/features/product-tour';
import { PlanSidebar } from '@/features/billing';
import { fetchPlanSummary } from '@/features/billing/server';
import { getLocale } from '@/core/i18n/server';
import { TimezoneBoundary } from '@/core/timezone/boundary';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function CaptainLayout({ children }: { children: ReactNode }) {
  const status = await captainApproval();
  if (status) return children;
  const plan = Promise.all([fetchPlanSummary(), getLocale()]);
  // T-428: the workspace frame pads its main with the shared launcher
  // clearance (.captain-content); the legacy shell does not, so the layout
  // supplies it here, and only here, so captain pages scroll clear of the
  // fixed KO launcher instead of sliding under it.
  const page = captainWorkspaceEnabled() ? children : <div className="captain-content">{children}</div>;
  return <TimezoneBoundary><div data-area="captain" className="bg-glow min-h-dvh"><PageContainer variant="captain"><CaptainShell sidebarFooter={<Suspense fallback={null}><PlanSidebar data={plan} /></Suspense>}><DemoMode>{page}<Suspense fallback={null}><ProductTour role="captain" /></Suspense></DemoMode></CaptainShell></PageContainer></div></TimezoneBoundary>;
}
