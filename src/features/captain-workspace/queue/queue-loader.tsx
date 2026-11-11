'use client';
import { lazy, Suspense } from 'react';
const Screen = lazy(() => import('./queue-screen').then(module => ({ default: module.QueueScreen })));
export function QueueLoader({ loadingLabel }: { loadingLabel: string }) {
  return <Suspense fallback={<p role="status">{loadingLabel}</p>}><Screen /></Suspense>;
}
