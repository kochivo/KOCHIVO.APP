import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  primary: 'glow bg-lime text-on-lime font-extrabold',
  secondary: 'glass text-ink hover:bg-ink/10',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
  danger: 'border border-danger/40 bg-danger-soft text-danger font-bold hover:bg-danger/20',
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
        'press inline-flex items-center justify-center gap-2 disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
