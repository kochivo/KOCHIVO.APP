import type { ReactNode } from 'react';
import { CaptainShell } from '@/features/roster';
import { DemoMode } from '@/features/demo';

export default function CaptainLayout({ children }: { children: ReactNode }) {
  return <CaptainShell><DemoMode>{children}</DemoMode></CaptainShell>;
}
