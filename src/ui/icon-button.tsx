import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
}

export function IconButton({ className, type = 'button', ...props }: IconButtonProps) {
  return <button {...props} type={type} className={cn('glass inline-flex size-12 shrink-0 items-center justify-center rounded-control text-ink transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-raised disabled:opacity-40', className)} />;
}
