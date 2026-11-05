import type { ReactNode } from 'react';
import { PageContainer } from '@/ui';
import { CaptainShell, captainApproval } from '@/features/roster';
import { DemoMode } from '@/features/demo';
import { ProductTour } from '@/features/product-tour';

export default async function CaptainLayout({ children }: { children: ReactNode }) {
  const status = await captainApproval();
  if (status) return children;
  return <div className="bg-glow min-h-dvh"><PageContainer variant="captain"><CaptainShell><DemoMode>{children}<ProductTour role="captain" /></DemoMode></CaptainShell></PageContainer></div>;
}
