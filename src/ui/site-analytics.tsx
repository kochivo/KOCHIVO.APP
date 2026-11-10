'use client';

import { lazy, Suspense } from 'react';

// Both load after first paint so they never count toward a route's first-load budget.
const Analytics = lazy(() => import('@vercel/analytics/next').then(module => ({ default: module.Analytics })));
const SpeedInsights = lazy(() => import('@vercel/speed-insights/next').then(module => ({ default: module.SpeedInsights })));

export function SiteAnalytics() {
  return <Suspense fallback={null}><Analytics /><SpeedInsights /></Suspense>;
}
