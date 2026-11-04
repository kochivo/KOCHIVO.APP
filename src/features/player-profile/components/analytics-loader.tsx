'use client';

import dynamic from 'next/dynamic';
import { AnalyticsSkeleton } from './analytics-skeleton';

// A client boundary lets Next split analytics out of the initial profile bundle.
const AnalyticsTab = dynamic(() => import('./analytics-tab').then(module => module.AnalyticsTab), {
  ssr: false,
  loading: AnalyticsSkeleton,
});

export function AnalyticsLoader({ playerId }: { playerId: string }) {
  return <AnalyticsTab playerId={playerId} />;
}
