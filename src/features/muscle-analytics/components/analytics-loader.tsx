'use client';

import dynamic from 'next/dynamic';
import { AnalyticsSkeleton } from './analytics-skeleton';

// A client boundary lets Next split analytics out of the initial profile bundle.
const AnalyticsTab = dynamic(() => import('./analytics-tab').then(module => module.AnalyticsTab), {
  ssr: false,
  loading: AnalyticsSkeleton,
});

/** `self` is the player viewing their own volume on the progress page. */
export function AnalyticsLoader({ playerId, self = false }: { playerId: string; self?: boolean }) {
  return <AnalyticsTab playerId={playerId} self={self} />;
}
