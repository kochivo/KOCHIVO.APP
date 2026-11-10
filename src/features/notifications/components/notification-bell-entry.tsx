'use client';

import { lazy, Suspense } from 'react';
import type { ComponentProps } from 'react';

const Control = lazy(() => import('./notification-bell').then(module => ({ default: module.NotificationBell })));

export function NotificationBell(props: ComponentProps<typeof Control>) {
  return <Suspense fallback={<div aria-hidden className="min-h-12 min-w-12" />}><Control {...props} /></Suspense>;
}
