'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui';

const ReadinessTab = dynamic(() => import('./readiness-tab').then(module => module.ReadinessTab), {
  ssr: false, loading: () => <LoadingState variant="cards" />,
});

export function ReadinessLoader({ playerId, today }: { playerId: string; today: string }) {
  return <ReadinessTab key={`${playerId}:${today}`} playerId={playerId} today={today} />;
}
