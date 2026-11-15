import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function FactRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-baseline justify-between gap-x-card-gap gap-y-inline border-b border-line-soft py-stack text-xs last:border-0', className)}>
    <dt className="text-muted">{label}</dt><dd className="min-w-0 break-words">{children}</dd>
  </div>;
}
