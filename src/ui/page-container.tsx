import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'captain';
}

export function PageContainer({ variant = 'default', className, ...props }: Props) {
  return <div className={cn('mx-auto w-full max-w-7xl', variant === 'captain' ? 'px-0 lg:max-w-none' : 'px-page-x', className)} {...props} />;
}
