'use client';

import { lazy, Suspense } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import type { WorkspacePlan } from './workspace-plan';

const Plan = lazy(() => import('./workspace-plan').then(module => ({ default: module.WorkspacePlan })));

export function WorkspacePlanEntry({ fallback, ...props }: ComponentProps<typeof WorkspacePlan> & { fallback: ReactNode }) {
  return <Suspense fallback={fallback}><Plan {...props} /></Suspense>;
}
