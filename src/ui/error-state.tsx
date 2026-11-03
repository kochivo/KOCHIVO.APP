import { TriangleAlert } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';

export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

export function ErrorState({ message, retryLabel, onRetry, className, ...props }: ErrorStateProps) {
  return (
    <div {...props} role="alert" className={cn('glass enter flex flex-col items-center gap-3 rounded-card p-6 text-center', className)}>
      <TriangleAlert aria-hidden className="size-8 text-danger" />
      <p>{message}</p>
      <Button variant="secondary" onClick={onRetry}>{retryLabel}</Button>
    </div>
  );
}
