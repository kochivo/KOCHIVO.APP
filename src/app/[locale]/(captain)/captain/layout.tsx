import type { ReactNode } from 'react';
import { CaptainShell } from '@/features/roster';
import { DemoMode } from '@/features/demo';
import { ProductTour } from '@/features/product-tour';

export default function CaptainLayout({ children }: { children: ReactNode }) {
  return <CaptainShell><DemoMode>{children}<ProductTour role="captain" /></DemoMode></CaptainShell>;
}
