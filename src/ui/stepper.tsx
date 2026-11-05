'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { messages } from './messages';
import { parseTypedNumber } from './typed-number';

import { Minus, Plus } from 'lucide-react';

export interface StepperProps {
  label: string;
  size?: 'gym' | 'compact';
  controlLabel?: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  /** Formats the big number, e.g. weight with one decimal. */
  format?: (value: number) => string;
  /** Muted line under the number, e.g. last time's value for progressive overload. */
  hint?: string;
}

/**
 * Number input for sweaty hands (PRD §4): two 76px buttons and a big value.
 * Tapping the value opens the number pad, so a far value is typed instead of pressed step by step.
 * In RTL the + sits on the right (start), matching reading order.
 */
export function Stepper({ label, size = 'gym', controlLabel = label, value, step, min = 0, max = Infinity, onChange, format = String, hint }: StepperProps) {
  const t = useT(messages);
  const compact = size === 'compact';
  const buttonClass = compact
    ? 'press-scale flex min-h-12 min-w-12 items-center justify-center rounded-control active:bg-ink/20'
    : 'press-scale flex size-19 items-center justify-center rounded-card bg-ink/10 active:bg-ink/20';
  const iconClass = compact ? 'size-8 rounded-control bg-ink/10 p-1.5' : 'size-8';
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Math.round(next * 100) / 100)));
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const typed = draft === null ? null : parseTypedNumber(draft);
    if (typed !== null) set(typed);
    setDraft(null);
  };
  return (
    <div className={compact ? '@container min-w-0' : 'glass-strong flex flex-col items-center gap-2 rounded-card p-4'}>
      <span className={compact ? 'block text-center text-xs text-muted' : 'text-sm text-muted'}>{label}</span>
      <div className={compact ? 'flex flex-col items-center @[9rem]:flex-row @[9rem]:justify-between' : 'flex w-full items-center justify-between'}>
        <button
          type="button"
          aria-label={t('increase', { controlLabel })}
          onClick={() => set(value + step)}
          disabled={value >= max}
          className={buttonClass}
        >
          <Plus className={iconClass} aria-hidden />
        </button>
        <input
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          aria-label={controlLabel}
          value={draft ?? format(value)}
          placeholder={draft === null ? undefined : format(value)}
          onFocus={() => setDraft('')}
          onChange={event => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') setDraft(null);
          }}
          className={`recessed min-h-12 min-w-0 rounded-control text-center tabular-nums text-ink placeholder:text-faint ${compact ? 'w-[4.5ch] text-lg font-bold' : 'w-[5ch] text-4xl font-extrabold ltr:tracking-tight sm:text-6xl'}`}
        />
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
      {hint && <span className="text-sm font-bold text-faint">{hint}</span>}
    </div>
  );
}
