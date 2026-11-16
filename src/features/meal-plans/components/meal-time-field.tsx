'use client';
import { useRef } from 'react';
import { Clock } from 'lucide-react';
import { clickableClass } from '@/ui/button';

// A compact pill: the whole pill opens the native time picker, so the captain
// never taps an empty area that does nothing.
export function MealTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const open = () => { try { input.current?.showPicker(); } catch { input.current?.focus(); } };
  return <label onClick={open} className={`${clickableClass} flex min-h-12 w-fit max-w-full cursor-pointer items-center gap-inline justify-self-start rounded-full border border-line bg-surface px-stack text-xs hover:bg-surface-raised focus-within:ring-2 focus-within:ring-lime`}>
    <Clock aria-hidden className="size-4 shrink-0 text-muted" />
    <span className="text-muted">{label}</span>
    <input ref={input} type="time" value={value} onChange={event => onChange(event.target.value || null)}
      className="w-24 cursor-pointer bg-transparent font-display text-ink outline-none" />
  </label>;
}
