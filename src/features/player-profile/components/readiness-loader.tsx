'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui';

const Readiness = dynamic(() => import('@/features/readiness').then(module => module.ReadinessLoader), {
  ssr: false, loading: () => <LoadingState variant="cards" />,
});

export function ReadinessLoader({ playerId, today }: { playerId: string; today: string }) {
  return <Readiness playerId={playerId} today={today} />;
}
