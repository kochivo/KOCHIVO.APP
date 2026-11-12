'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

const Analytics = dynamic(() => import('@/features/muscle-analytics').then(module => module.AnalyticsLoader), {
  ssr: false, loading: () => <LoadingState variant="cards" />,
});
const Readiness = dynamic(() => import('@/features/readiness').then(module => module.ReadinessLoader), {
  ssr: false, loading: () => <LoadingState variant="cards" />,
});
const Scans = dynamic(() => import('@/features/body-scans').then(module => module.BodyScansLoader), {
  ssr: false, loading: () => <LoadingState variant="cards" />,
});
export function DeferredSectionEntry({ kind, playerId, today }: { kind: 'analysis' | 'readiness' | 'scans'; playerId: string; today: string }) {
  if (kind === 'analysis') return <Analytics playerId={playerId} />;
  if (kind === 'readiness') return <Readiness playerId={playerId} today={today} />;
  return <Scans playerId={playerId} />;
}
