import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  primary: 'bg-lime text-on-lime font-extrabold hover:brightness-105 active:brightness-95',
  secondary: 'glass text-ink hover:bg-white/10',
  ghost: 'bg-transparent text-ink hover:bg-white/5',
};

const sizes: Record<Size, string> = {
  md: 'min-h-touch px-4 text-sm rounded-control',
  lg: 'min-h-14 px-5 text-base rounded-control',
  xl: 'min-h-17 px-6 text-xl rounded-card',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition motion-reduce:transition-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
