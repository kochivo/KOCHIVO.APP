import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'captain';
}

export function PageContainer({ variant = 'default', className, ...props }: Props) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 md:px-6', variant === 'captain' && 'lg:max-w-none lg:px-0', className)} {...props} />;
}
