'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Option { value: string; label: string }
type Options = readonly [Option, Option] | readonly [Option, Option, Option] | readonly [Option, Option, Option, Option];
const variants: Record<'active' | 'idle', string> = {
  active: 'glass-raised text-ink font-bold',
  idle: 'text-muted hover:text-ink',
};

export interface SegmentedProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: Options;
  value: string;
  phoneScroll?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function Segmented({ options, value, onChange, className, phoneScroll, disabled, ...props }: SegmentedProps) {
  return (
    <div {...props} role="radiogroup" aria-disabled={disabled} className={cn('glass flex gap-inline rounded-control p-inline', phoneScroll && 'max-md:max-w-full max-md:overflow-x-auto', className)}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={disabled}
          tabIndex={!disabled && option.value === value ? 0 : -1}
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
          className={cn('press min-h-12 min-w-0 flex-1 rounded-control px-stack text-sm', phoneScroll && 'max-md:shrink-0 max-md:basis-auto max-md:whitespace-nowrap', variants[option.value === value ? 'active' : 'idle'])}
        >{option.label}</button>
      ))}
    </div>
  );
}
