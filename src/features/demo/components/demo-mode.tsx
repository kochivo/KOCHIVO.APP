import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { LoadingState } from '@/ui';
import { loadDemoProfile } from '../data/load-demo-profile';
import { unstable_rethrow } from 'next/navigation';
import { demoHours } from '../data/demo-profile';
import { DemoProvider } from './demo-provider';
import dynamic from 'next/dynamic';
import { DemoProfileError } from './demo-profile-error';

const DemoBanner = dynamic(() => import('./demo-banner').then(module => module.DemoBanner));

interface Props { children: ReactNode; failOpen?: boolean }

async function DemoState({ children, failOpen }: Props) {
  const result = await loadDemoProfile().catch((error: unknown) => { unstable_rethrow(error); return null; });
  // Real players must keep their app when the demo check fails; only demo workspaces need the banner.
  if (!result) return failOpen ? children : <DemoProfileError />;
  if (!result.expiresAt) return children;
  return <DemoProvider expiresAt={result.expiresAt}>
    {result.expiresAt && <DemoBanner role={result.role} hours={demoHours(result.expiresAt, new Date())} />}
    {children}
  </DemoProvider>;
}

export function DemoMode({ children, failOpen }: Props) {
  return <Suspense fallback={<LoadingState />}><DemoState failOpen={failOpen}>{children}</DemoState></Suspense>;
}
