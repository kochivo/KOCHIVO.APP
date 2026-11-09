'use client';

import { lazy, Suspense, useSyncExternalStore } from 'react';
import { koPreviewAllowed } from '../policy';
import type { KoRole } from '../policy';
const KoWidget = lazy(() => import('./ko-widget').then(module => ({ default: module.KoWidget })));

const subscribe = () => () => {};
const serverSnapshot = () => false;
const localSnapshot = () => typeof window !== 'undefined' && koPreviewAllowed(process.env.NODE_ENV, window.location.hostname);

export function KoPreview({ role, interactive = false }: { role: KoRole; interactive?: boolean }) {
  const local = useSyncExternalStore(subscribe, localSnapshot, serverSnapshot);
  return local ? <Suspense fallback={null}><KoWidget role={role} interactive={interactive} /></Suspense> : null;
}
