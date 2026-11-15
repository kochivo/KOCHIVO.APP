import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export const clickableClass = 'press cursor-pointer hover:opacity-90 focus-visible:ring-2 focus-visible:ring-lime motion-safe:transition-[transform,opacity] disabled:cursor-default';

const variants: Record<Variant, string> = {
  primary: 'control-primary text-on-lime font-extrabold',
  secondary: 'control-secondary text-ink',
  ghost: 'control-ghost bg-transparent text-ink hover:bg-ink/5',
  danger: 'control-danger border border-danger/40 bg-danger-soft text-danger font-bold hover:bg-danger/20',
};

const sizes: Record<Size, string> = {
  sm: 'control-sm min-h-12! px-control text-sm',
  md: 'control-md min-h-12 px-control text-sm',
  lg: 'control-lg min-h-14 px-control text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

// The unlayered .control rule owns the radius, so only padding and font size need de-duplicating.
export function buttonClass({ variant = 'primary', size = 'md', block, className = '' }: Pick<ButtonProps, 'variant' | 'size' | 'block' | 'className'> = {}) {
  const own = / !?px?-/.test(' ' + className), ownText = / !?text-(micro|xs|row|sm|md|title|h|stat[\w-]*|base|lg|\d?xl|\[)/.test(' ' + className);
  const sizing = sizes[size].replace(/px-\S+/, own ? '' : '$&').replace(/text-\S+/, ownText ? '' : '$&');
  return cn('control press inline-flex items-center justify-center gap-inline rounded-control disabled:opacity-40',
    block ? 'w-full' : block === undefined && variant === 'primary' && 'w-full md:w-auto', variants[variant], sizing, className);
}

export function Button({ variant, size, block, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={buttonClass({ variant, size, block, className })}
    />
  );
}
