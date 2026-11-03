'use client';
import { useT } from '@/core/i18n/client';
import { messages } from './messages';

import { Minus, Plus } from 'lucide-react';

export interface StepperProps {
  label: string;
  size?: 'gym' | 'compact';
  controlLabel?: string;
  value: number;
  step: number;
  min?: number;
  onChange: (next: number) => void;
  /** Formats the big number, e.g. weight with one decimal. */
  format?: (value: number) => string;
  /** Muted line under the number, e.g. last time's value for progressive overload. */
  hint?: string;
}

/**
 * Keyboard-free number input for sweaty hands (PRD §4): two 76px buttons and a big value.
 * In RTL the + sits on the right (start), matching reading order.
 */
export function Stepper({ label, size = 'gym', controlLabel = label, value, step, min = 0, onChange, format = String, hint }: StepperProps) {
  const t = useT(messages);
  const compact = size === 'compact';
  const buttonClass = compact
    ? 'press-scale flex min-h-12 min-w-12 items-center justify-center rounded-control active:bg-ink/20'
    : 'press-scale flex size-19 items-center justify-center rounded-card bg-ink/10 active:bg-ink/20';
  const iconClass = compact ? 'size-8 rounded-control bg-ink/10 p-1.5' : 'size-8';
  const set = (next: number) => onChange(Math.max(min, Math.round(next * 100) / 100));
  return (
    <div className={compact ? '@container min-w-0' : 'glass-strong flex flex-col items-center gap-2 rounded-card p-4'}>
      <span className={compact ? 'block text-center text-xs text-muted' : 'text-sm text-muted'}>{label}</span>
      <div className={compact ? 'flex flex-col items-center @[9rem]:flex-row @[9rem]:justify-between' : 'flex w-full items-center justify-between'}>
        <button
          type="button"
          aria-label={t('increase', { controlLabel })}
          onClick={() => set(value + step)}
          className={buttonClass}
        >
          <Plus className={iconClass} aria-hidden />
        </button>
        <output aria-label={controlLabel} aria-live="polite" className={compact ? 'min-w-0 text-lg font-bold' : 'min-w-0 text-4xl font-extrabold tracking-tight sm:text-6xl'}>
          <bdi>{format(value)}</bdi>
        </output>
        <button
          type="button"
          aria-label={t('decrease', { controlLabel })}
          onClick={() => set(value - step)}
          disabled={value <= min}
          className={`${buttonClass} disabled:opacity-40`}
        >
          <Minus className={iconClass} aria-hidden />
        </button>
      </div>
      {hint && <span className="text-sm font-bold text-muted">{hint}</span>}
    </div>
  );
}
