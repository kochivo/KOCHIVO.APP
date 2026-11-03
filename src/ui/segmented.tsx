'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Option { value: string; label: string }
type Options = readonly [Option, Option] | readonly [Option, Option, Option] | readonly [Option, Option, Option, Option];
const variants: Record<'active' | 'idle', string> = {
  active: 'bg-ink text-on-lime',
  idle: 'text-muted hover:text-ink',
};

export interface SegmentedProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: Options;
  value: string;
  onChange: (value: string) => void;
}

export function Segmented({ options, value, onChange, className, ...props }: SegmentedProps) {
  return (
    <div {...props} role="radiogroup" className={cn('glass flex gap-1 rounded-control p-1', className)}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            const direction = getComputedStyle(event.currentTarget).direction;
            const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
            const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
            let next = index;
            if (event.key === forward || event.key === 'ArrowDown') next = (index + 1) % options.length;
            else if (event.key === backward || event.key === 'ArrowUp') next = (index + options.length - 1) % options.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = options.length - 1;
            else return;
            event.preventDefault();
            const option = options[next];
            if (option) onChange(option.value);
            const target = event.currentTarget.parentElement?.children.item(next);
            if (target instanceof HTMLButtonElement) target.focus();
          }}
          className={cn('min-h-12 min-w-0 flex-1 rounded-control px-3 text-sm transition-colors duration-150 motion-reduce:transition-none', variants[option.value === value ? 'active' : 'idle'])}
        >{option.label}</button>
      ))}
    </div>
  );
}
