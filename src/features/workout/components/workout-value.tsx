'use client';
import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { parseTypedNumber } from '@/ui/typed-number';
import { messages } from '../messages';
import { IconButton } from '@/ui/icon-button';

export function WorkoutValue({ kind, value, disabled, invalid, focusInvalid = invalid, onChange, inline = false }: {
  kind: 'weight' | 'reps'; value: number; disabled: boolean; invalid: boolean; focusInvalid?: boolean; onChange: (value: number) => void;
  inline?: boolean;
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
  const button = (increase: boolean) => <IconButton
    aria-label={t(weight ? increase ? 'v3IncreaseWeight' : 'v3DecreaseWeight' : increase ? 'v3IncreaseReps' : 'v3DecreaseReps')}
    disabled={disabled || (increase ? value >= max : value <= 0)} onClick={() => change(value + (increase ? step : -step))}
    className={`${inline ? 'size-16' : 'size-14'} bg-line disabled:opacity-40`}>
    {increase ? <Plus aria-hidden className="size-6" /> : <Minus aria-hidden className="size-6" />}
  </IconButton>;
  return <div className={`glass-strong items-center gap-inline rounded-card border border-line-soft px-stack py-stack ${inline ? 'grid grid-cols-[64px_minmax(0,1fr)_64px]' : 'flex flex-col'}`}>
    {inline && button(true)}
    <div className="flex min-w-0 flex-col items-center gap-inline">
    <label className="relative min-h-12 w-full rounded-lg text-center focus-within:outline-2 focus-within:outline-lime">
      <span aria-hidden className="font-display text-stat-wide leading-none font-extrabold tabular-nums">{draft ?? formatNumber(value, locale)}</span>
      <input ref={input} aria-label={t(weight ? 'weightKg' : 'reps')} aria-invalid={invalid} aria-describedby={invalid ? 'set-error' : undefined}
        disabled={disabled} type="text" inputMode={weight ? 'decimal' : 'numeric'} enterKeyHint="done" autoComplete="off"
        value={draft ?? formatNumber(value, locale)} onFocus={() => setDraft('')} onChange={event => setDraft(event.target.value)}
        onBlur={() => { const typed = draft === null ? null : parseTypedNumber(draft); if (typed !== null) change(typed); setDraft(null); }}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setDraft(null); }}
        className="absolute inset-0 size-full opacity-0" />
    </label>
    <span className="text-xs text-muted">{t(weight ? 'v3Kg' : 'v3Reps')}</span>
    </div>
    {inline ? button(false) : <div className="flex gap-inline">{button(false)}{button(true)}</div>}
  </div>;
}
