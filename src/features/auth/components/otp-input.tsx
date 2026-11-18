'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useEffect, useRef } from 'react';
import { TextField } from '@/ui/text-field';

import { otpDigits } from '../otp-digits';

export function OtpInput({ value, onChange, disabled, focusOnEntry, describedBy }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; focusOnEntry?: boolean; describedBy?: string;
}) {
  const t = useT(messages);
  const container = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  useEffect(() => {
    if (focusOnEntry && !disabled && !focused.current) {
      container.current?.querySelector('input')?.focus();
      focused.current = true;
    }
  }, [focusOnEntry, disabled]);
  function focus(index: number) { container.current?.querySelectorAll('input').item(index)?.focus(); }
  function insert(index: number, input: string) {
    const digits = otpDigits(input).slice(0, 6 - index);
    if (!digits) return;
    onChange((value.slice(0, index) + digits + value.slice(index + digits.length)).slice(0, 6));
    focus(Math.min(index + digits.length, 5));
  }
  return <div ref={container} dir="ltr" role="group" className="grid grid-cols-6 gap-inline" aria-label={t('signInCode')}>
    {Array.from({ length: 6 }, (_, index) => <TextField key={index} label={t('digit', { n: index + 1 })} hideLabel className="min-h-14 px-inline text-center text-xl"
      inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} pattern="[0-9]*" disabled={disabled}
      aria-describedby={index === 0 ? describedBy : undefined} value={value[index] ?? ''} onFocus={(event) => event.target.select()}
      onChange={(event) => { if (!event.target.value) onChange(value.slice(0, index)); else insert(index, event.target.value); }}
      onPaste={(event) => { event.preventDefault(); insert(index, event.clipboardData.getData('text')); }}
      onKeyDown={(event) => {
        if (event.key === 'Backspace' && !value[index] && index > 0) { event.preventDefault(); onChange(value.slice(0, index - 1)); focus(index - 1); }
        if (event.key === 'ArrowLeft' && index > 0) focus(index - 1);
        if (event.key === 'ArrowRight' && index < 5) focus(index + 1);
      }} />)}
  </div>;
}
