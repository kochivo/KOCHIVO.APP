import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max: number;
  /** The 4px bar used under stats and list rows. */
  thin?: boolean;
}

export function ProgressBar({ value, max, thin, className, ...props }: ProgressBarProps) {
  const percent = Number.isFinite(value) && Number.isFinite(max) && max > 0
    ? Math.min(100, Math.max(0, value / max * 100)) : 0;
  return (
    <div {...props} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className={cn(thin ? 'h-1 overflow-hidden rounded-sm bg-ink/7' : 'h-2 overflow-hidden rounded-control bg-line', className)}>
      <div className={thin ? 'progress-surface h-full rounded-sm bg-lime' : 'progress-surface h-full rounded-control bg-lime'} style={{ width: `${percent}%` }} />
    </div>
  );
}
