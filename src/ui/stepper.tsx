'use client';

import { Minus, Plus } from 'lucide-react';

export interface StepperProps {
  label: string;
  value: number;
  step: number;
  min?: number;
  onChange: (next: number) => void;
  /** Formats the big number, e.g. weight with one decimal. */
  format?: (value: number) => string;
}

/**
 * Keyboard-free number input for sweaty hands (PRD §4): two 76px buttons and a big value.
 * In RTL the + sits on the right (start), matching reading order.
 */
export function Stepper({ label, value, step, min = 0, onChange, format = String }: StepperProps) {
  const set = (next: number) => onChange(Math.max(min, Math.round(next * 100) / 100));
  return (
    <div className="glass-strong flex flex-col items-center gap-2 rounded-card p-4">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          aria-label={`زوّد ${label}`}
          onClick={() => set(value + step)}
          className="flex size-19 items-center justify-center rounded-card bg-white/10 active:bg-white/20"
        >
          <Plus className="size-8" aria-hidden />
        </button>
        <output aria-live="polite" className="text-6xl font-extrabold tracking-tight">
          {format(value)}
        </output>
        <button
          type="button"
          aria-label={`قلّل ${label}`}
          onClick={() => set(value - step)}
          disabled={value <= min}
          className="flex size-19 items-center justify-center rounded-card bg-white/10 active:bg-white/20 disabled:opacity-40"
        >
          <Minus className="size-8" aria-hidden />
        </button>
      </div>
    </div>
  );
}
