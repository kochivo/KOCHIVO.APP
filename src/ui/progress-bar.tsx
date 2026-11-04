import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max: number;
}

export function ProgressBar({ value, max, className, ...props }: ProgressBarProps) {
  const percent = Number.isFinite(value) && Number.isFinite(max) && max > 0
    ? Math.min(100, Math.max(0, value / max * 100)) : 0;
  return (
    <div {...props} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className={cn('h-2 overflow-hidden rounded-control bg-line', className)}>
      <div className="progress-surface h-full rounded-control bg-lime" style={{ width: `${percent}%` }} />
    </div>
  );
}
