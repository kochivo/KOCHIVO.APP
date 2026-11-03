'use client';
import { SkeletonCard, SkeletonList, SkeletonText } from './skeleton';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function LoadingState({ className, variant = 'list', ...props }: HTMLAttributes<HTMLDivElement> & { variant?: 'list' | 'cards' | 'detail' }) {
  return (
    <div {...props} className={cn('enter space-y-4', className)}>
      {variant === 'list' ? <SkeletonList /> : variant === 'cards' ?
        <div className="grid gap-4 sm:grid-cols-2"><SkeletonCard /><SkeletonCard /></div> :
        <><SkeletonCard lines={2} /><SkeletonText lines={5} /></>}
    </div>
  );
}
