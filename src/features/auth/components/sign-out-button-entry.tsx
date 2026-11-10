'use client';

import { lazy, Suspense } from 'react';
import type { ComponentProps } from 'react';

const Control = lazy(() => import('./sign-out-button').then(module => ({ default: module.SignOutButton })));

export function SignOutButton(props: ComponentProps<typeof Control>) {
  return <Suspense fallback={<div aria-hidden className="min-h-12 w-full" />}><Control {...props} /></Suspense>;
}
