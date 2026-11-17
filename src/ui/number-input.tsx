'use client';

import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { parseTypedNumber } from './typed-number';
import { cn } from '@/lib/cn';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max'> & {
  value: number | null | undefined | '';
  min?: number; max?: number;
  label?: string; hint?: string; error?: string;
} & ({ allowEmpty: true; onCommit: (value: number | null) => void } |
  { allowEmpty?: false; onCommit: (value: number) => void });

export function NumberInput({ value, min, max, allowEmpty, onCommit, className, inputMode = 'decimal', label, hint, error,
  onFocus, onBlur, onKeyDown, ...props }: Props) {
  const [text, setText] = useState(String(value ?? ''));
  const [focused, setFocused] = useState(false);
  const [edited, setEdited] = useState(false);
  const generatedId = useId();
  const display = focused ? text : String(value ?? '');
  function commit() {
    if (!edited) return;
    const parsed = parseTypedNumber(text);
    if (parsed === null || !Number.isFinite(parsed)) {
      if (allowEmpty) onCommit(null);
      else if (typeof value === 'number') onCommit(value);
      setText(String(value ?? ''));
      return;
    }
    const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed));
    setText(String(next)); onCommit(next);
  }
  const input = <input {...props} id={props.id ?? (label ? generatedId : undefined)} type="text" inputMode={inputMode} dir="ltr" value={display}
    aria-invalid={error ? true : props['aria-invalid']}
    aria-describedby={label && (error || hint) ? `${generatedId}-hint` : props['aria-describedby']}
    className={cn('min-h-12', label && 'min-w-0 w-full rounded-control glass recessed px-page-x text-base text-ink', className)}
    onChange={event => { setText(event.target.value); setEdited(true); }}
    onFocus={event => { setText(String(value ?? '')); setEdited(false); setFocused(true); event.currentTarget.select(); onFocus?.(event); }}
    onBlur={event => { commit(); setFocused(false); onBlur?.(event); }}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
      onKeyDown?.(event);
    }} />;
  return label ? <div className="flex flex-col gap-inline text-start">
    <label htmlFor={props.id ?? generatedId} className="text-sm font-semibold">{label}</label>{input}
    {(error || hint) && <p id={`${generatedId}-hint`} role={error ? 'alert' : undefined} className={error ? 'text-sm text-danger' : 'text-sm text-faint'}>{error || hint}</p>}
  </div> : input;
}
