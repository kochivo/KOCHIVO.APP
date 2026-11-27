'use client';
import { useEffect, useId, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { parseSetValue } from '../set-validation';
import { Button } from '@/ui/button';
import { messages } from '../messages';
import { IconButton } from '@/ui/icon-button';

export function WorkoutValue({ kind, value, disabled, invalid, focusInvalid = invalid, onChange, inline = false, draft, onDraft }: {
  kind: 'weight' | 'reps'; value: number; disabled: boolean; invalid: boolean; focusInvalid?: boolean; onChange: (value: number) => void;
  inline?: boolean; draft?: string; onDraft: (text?: string) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const errorId = useId();
  const parsed = draft === undefined ? undefined : parseSetValue(kind, draft);
  const typedInvalid = !disabled && parsed === null;
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
  return <div className={`glass-strong min-w-0 items-center gap-inline rounded-control border border-line-soft py-stack ${inline ? 'grid grid-cols-[64px_minmax(0,1fr)_64px] px-stack' : 'flex flex-col'}`}>
    {inline && button(true)}
    <div className="flex w-full min-w-0 flex-col items-center gap-inline">
    <label className="relative min-h-12 w-full rounded-lg text-center focus-within:outline-2 focus-within:outline-lime">
      <span aria-hidden className="max-w-full font-numeric text-stat leading-none font-extrabold tabular-nums sm:text-stat-wide">{draft ?? formatNumber(value, locale)}</span>
      <input ref={input} aria-label={t(weight ? 'weightKg' : 'reps')} aria-invalid={invalid || typedInvalid} aria-describedby={typedInvalid ? errorId : invalid ? 'set-error' : undefined}
        disabled={disabled} type="text" inputMode={weight ? 'decimal' : 'numeric'} enterKeyHint="done" autoComplete="off"
        value={draft ?? formatNumber(value, locale)} onFocus={event => event.currentTarget.select()} onChange={event => onDraft(event.target.value)}
        onBlur={() => { if (parsed != null) onChange(parsed); }}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') onDraft(); }}
        className="absolute inset-0 size-full opacity-0" />
    </label>
    <span className="text-xs text-muted">{t(weight ? 'v3Kg' : 'v3Reps')}</span>
    {typedInvalid && <><p id={errorId} role="alert" className="text-xs text-danger">{t(weight ? 'typedWeightError' : 'typedRepsError')}</p>
      <Button variant="secondary" className="max-w-full px-inline!" onClick={() => { onDraft(); input.current?.focus(); }}>{t('revertSetValue')}</Button></>}
    </div>
    {inline ? button(false) : <div className="flex gap-inline">{button(false)}{button(true)}</div>}
  </div>;
}
