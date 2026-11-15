'use client';

import type { HTMLAttributes } from 'react';
import { useT } from '@/core/i18n/client';
import { cn } from '@/lib/cn';
import { useInView } from '@/lib/use-in-view';
import { messages } from './messages';

type Props = HTMLAttributes<HTMLDivElement> & { lines?: number; rows?: number };
const block = 'shimmer rounded-control bg-line';

function Status({ children, className, ...props }: Props) {
  const t = useT(messages);
  const motionRef = useInView<HTMLDivElement>('.shimmer');
  return <div {...props} ref={motionRef} role="status" aria-busy="true" className={className}>
    <span className="sr-only">{t('loading')}</span>
    <div aria-hidden="true">{children}</div>
  </div>;
}

function Lines({ lines = 3 }: { lines?: number }) {
  return <div className="space-y-3">{Array.from({ length: lines }, (_, index) =>
    <div key={index} className={cn(block, 'h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />)}</div>;
}

export function Skeleton({ className, ...props }: Props) {
  return <Status {...props} className={cn(block, 'h-5', className)} />;
}

export function SkeletonText({ lines = 3, ...props }: Props) {
  return <Status {...props}><Lines lines={lines} /></Status>;
}

export function SkeletonCard({ lines = 3, className, ...props }: Props) {
  return <Status {...props} className={cn('glass rounded-card p-6', className)}>
    <div className="space-y-5"><div className={cn(block, 'h-6 w-1/3')} /><Lines lines={lines} /></div>
  </Status>;
}

export function SkeletonList({ rows = 3, ...props }: Props) {
  return <Status {...props}><div className="space-y-4">{Array.from({ length: rows }, (_, index) =>
    <div key={index} className="glass flex items-center gap-4 rounded-card p-5">
      <div className={cn(block, 'size-12 shrink-0 rounded-full')} />
      <div className="flex-1"><Lines lines={2} /></div>
    </div>)}</div></Status>;
}
