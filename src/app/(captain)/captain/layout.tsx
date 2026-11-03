import type { ReactNode } from 'react';
import { CaptainShell } from '@/features/roster';

export default function CaptainLayout({ children }: { children: ReactNode }) {
  return <CaptainShell>{children}</CaptainShell>;
}
