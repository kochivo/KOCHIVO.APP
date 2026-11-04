import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function CardGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-1 gap-card-gap md:grid-cols-2 md:gap-4 lg:grid-cols-3', className)} {...props} />;
}
