import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'md' | 'lg';
}

export function Stat({ size = 'md', className, ...props }: StatProps) {
  return <div className={cn('glass-strong rounded-control p-3 font-display font-bold tabular-nums',
    size === 'lg' ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl', className)} {...props} />;
}
