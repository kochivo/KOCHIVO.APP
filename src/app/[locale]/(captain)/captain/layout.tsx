import { Suspense, type ReactNode } from 'react';
import { PageContainer } from '@/ui';
import { CaptainShell, captainApproval } from '@/features/roster';
import { DemoMode } from '@/features/demo';
import { ProductTour } from '@/features/product-tour';
import { PlanSidebar } from '../../../../features/billing/components/plan-sidebar';
import { getLocale } from '@/core/i18n/server';
import { fetchPlanSummary } from '../../../../features/billing/data/plan-summary';

export default async function CaptainLayout({ children }: { children: ReactNode }) {
  const status = await captainApproval();
  if (status) return children;
  const plan = Promise.all([fetchPlanSummary(), getLocale()]);
  return <div className="bg-glow min-h-dvh"><PageContainer variant="captain"><CaptainShell sidebarFooter={<Suspense fallback={null}><PlanSidebar data={plan} /></Suspense>}><DemoMode>{children}<ProductTour role="captain" /></DemoMode></CaptainShell></PageContainer></div>;
}
