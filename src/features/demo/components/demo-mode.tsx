import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { LoadingState } from '@/ui';
import { loadDemoExpiry } from '../data/load-demo-profile';
import { demoHours } from '../data/demo-profile';
import { DemoProvider } from './demo-provider';
import { DemoBanner } from './demo-banner';
import { DemoProfileError } from './demo-profile-error';

async function DemoState({ children }: { children: ReactNode }) {
  const result = await loadDemoExpiry().then((expiresAt) => ({ expiresAt })).catch(() => null);
  if (!result) return <DemoProfileError />;
  return <DemoProvider expiresAt={result.expiresAt}>
    {result.expiresAt && <DemoBanner hours={demoHours(result.expiresAt, new Date())} />}
    {children}
  </DemoProvider>;
}

export function DemoMode({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState />}><DemoState>{children}</DemoState></Suspense>;
}
