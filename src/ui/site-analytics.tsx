'use client';

import { lazy, Suspense } from 'react';

const Analytics = lazy(() => import('@vercel/analytics/next').then(module => ({ default: module.Analytics })));

export function SiteAnalytics() {
  return <Suspense fallback={null}><Analytics /></Suspense>;
}
