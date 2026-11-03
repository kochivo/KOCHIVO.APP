import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants: Record<'pressed' | 'idle', string> = {
  pressed: 'border-lime bg-lime-soft text-lime',
  idle: 'border-line bg-surface text-muted',
};

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
}

export function Chip({ pressed, className, type = 'button', ...props }: ChipProps) {
  return <button {...props} type={type} aria-pressed={pressed} className={cn('min-h-12 rounded-control border px-4 text-sm transition disabled:opacity-40', variants[pressed ? 'pressed' : 'idle'], className)} />;
}
