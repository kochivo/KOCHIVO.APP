import type { ReactNode } from 'react';
import { PageContainer } from '@/ui';
import { CaptainShell } from '@/features/roster';
import { DemoMode } from '@/features/demo';
import { ProductTour } from '@/features/product-tour';

export default function CaptainLayout({ children }: { children: ReactNode }) {
  return <div className="bg-glow min-h-dvh"><PageContainer><CaptainShell><DemoMode>{children}<ProductTour role="captain" /></DemoMode></CaptainShell></PageContainer></div>;
}
