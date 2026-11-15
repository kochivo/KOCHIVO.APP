import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/cn';
import { buttonClass } from './button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({ className, type = 'button', ...props }: IconButtonProps) {
  return <button {...props} type={type} className={buttonClass({ variant: 'secondary', className: cn('size-12 shrink-0 p-0', className) })} />;
}
