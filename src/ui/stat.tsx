import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'md' | 'lg';
}

export function Stat({ size = 'md', className, ...props }: StatProps) {
  return <div className={cn('glass-strong rounded-control p-stack font-display font-bold tabular-nums',
    size === 'lg' ? 'text-stat-large md:text-stat-large-wide' : 'text-stat md:text-stat-wide', className)} {...props} />;
}
