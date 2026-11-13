'use client';
import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { parseTypedNumber } from '@/ui/typed-number';
import { messages } from '../messages';

export function WorkoutValue({ kind, value, disabled, invalid, focusInvalid = invalid, onChange }: {
  kind: 'weight' | 'reps'; value: number; disabled: boolean; invalid: boolean; focusInvalid?: boolean; onChange: (value: number) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [draft, setDraft] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focusInvalid) input.current?.focus(); }, [focusInvalid]);
  const weight = kind === 'weight';
  const step = weight ? 2.5 : 1;
  const max = weight ? 500 : 100;
  const change = (next: number) => onChange(Math.min(max, Math.max(0, Math.round(next * 100) / 100)));
  return <div className="glass-strong flex flex-col items-center gap-2 rounded-[24px] border border-line-soft px-2.5 py-3">
    <span className="text-xs text-muted">{t(weight ? 'v3Kg' : 'v3Reps')}</span>
    <label className="relative min-h-12 w-full rounded-lg text-center focus-within:outline-2 focus-within:outline-lime">
      <span aria-hidden className="font-display text-[44px] leading-none font-extrabold tabular-nums">{draft ?? formatNumber(value, locale)}</span>
      <input ref={input} aria-label={t(weight ? 'weightKg' : 'reps')} aria-invalid={invalid} aria-describedby={invalid ? 'set-error' : undefined}
        disabled={disabled} type="text" inputMode={weight ? 'decimal' : 'numeric'} enterKeyHint="done" autoComplete="off"
        value={draft ?? formatNumber(value, locale)} onFocus={() => setDraft('')} onChange={event => setDraft(event.target.value)}
        onBlur={() => { const typed = draft === null ? null : parseTypedNumber(draft); if (typed !== null) change(typed); setDraft(null); }}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setDraft(null); }}
        className="absolute inset-0 size-full opacity-0" />
    </label>
    <div className="flex gap-2">
      <button type="button" aria-label={t(weight ? 'v3DecreaseWeight' : 'v3DecreaseReps')} disabled={disabled || value <= 0}
        onClick={() => change(value - step)} className="flex size-14 items-center justify-center rounded-full bg-line disabled:opacity-40"><Minus aria-hidden className="size-6" /></button>
      <button type="button" aria-label={t(weight ? 'v3IncreaseWeight' : 'v3IncreaseReps')} disabled={disabled || value >= max}
        onClick={() => change(value + step)} className="flex size-14 items-center justify-center rounded-full bg-line disabled:opacity-40"><Plus aria-hidden className="size-6" /></button>
    </div>
  </div>;
}
